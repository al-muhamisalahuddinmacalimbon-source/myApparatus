import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import pool from "@/lib/db";
import { addStudentNotification } from "@/lib/services/studentNotificationWriter";

type BorrowItem = {
  id?: number;
  variant_id?: number;
  quantity: number;
};

type StockRow = {
  id: number;
  variant_id?: number;
  available_stock: number;
  name: string;
  variant_name?: string;
  status: string;
  variant_status?: string;
};

function isBorrowItem(value: unknown): value is BorrowItem {
  if (!value || typeof value !== "object") return false;
  const hasId = "id" in value;
  const hasVariantId = "variant_id" in value;
  return (
    (hasId || hasVariantId) &&
    (!hasId ||
      (typeof value.id === "number" &&
        Number.isInteger(value.id) &&
        value.id > 0)) &&
    (!hasVariantId ||
      (typeof value.variant_id === "number" &&
        Number.isInteger(value.variant_id) &&
        value.variant_id > 0)) &&
    "quantity" in value &&
    typeof value.quantity === "number" &&
    Number.isInteger(value.quantity) &&
    value.quantity > 0
  );
}

export async function POST(request: Request) {
  let client: PoolClient | undefined;
  let transactionStarted = false;

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("student_id" in body)) {
      return NextResponse.json(
        { error: "Invalid borrow request payload" },
        { status: 400 },
      );
    }

    const studentId = body.student_id;
    const items = "items" in body ? body.items : undefined;
    const dueDays =
      "due_days" in body && body.due_days !== undefined ? body.due_days : 3;

    if (
      typeof studentId !== "string" ||
      studentId.trim().length === 0 ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !items.every(isBorrowItem) ||
      new Set(items.map((item) => item.variant_id ?? item.id)).size !==
        items.length ||
      typeof dueDays !== "number" ||
      !Number.isInteger(dueDays) ||
      dueDays < 1 ||
      dueDays > 365
    ) {
      return NextResponse.json(
        { error: "Invalid borrow request payload" },
        { status: 400 },
      );
    }

    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const studentCheck = await client.query(
      "SELECT student_id FROM students WHERE student_id = $1",
      [studentId.trim()],
    );
    if (studentCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "Student ID is not registered" },
        { status: 404 },
      );
    }

    const borrowedItems: Array<{
      id: number;
      variant_id: number | null;
      name: string;
      quantity: number;
    }> = [];

    for (const item of items) {
      const stockCheck = item.variant_id
        ? await client.query<StockRow>(
            `SELECT a.id, v.id AS variant_id, v.available_stock, a.name,
               v.name AS variant_name, a.status, v.status AS variant_status
             FROM apparatus_variants v
             JOIN apparatus a ON a.id = v.apparatus_id
             WHERE v.id = $1
               AND ($2::integer IS NULL OR a.id = $2)
             FOR UPDATE OF v`,
            [item.variant_id, item.id ?? null],
          )
        : await client.query<StockRow>(
            "SELECT id, available_stock, name, status FROM apparatus WHERE id = $1 FOR UPDATE",
            [item.id],
          );

      if (stockCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        transactionStarted = false;
        return NextResponse.json(
          {
            error: item.variant_id
              ? `Apparatus variant ID ${item.variant_id} not found`
              : `Apparatus ID ${item.id} not found`,
          },
          { status: 400 },
        );
      }

      const stock = stockCheck.rows[0];
      const isVariant = item.variant_id !== undefined;
      const itemName = isVariant
        ? `${stock.name} (${stock.variant_name})`
        : stock.name;
      if (stock.available_stock < item.quantity) {
        await client.query("ROLLBACK");
        transactionStarted = false;
        return NextResponse.json(
          { error: `Insufficient stock for ${itemName}` },
          { status: 400 },
        );
      }

      if (
        stock.status !== "Active" ||
        (isVariant && stock.variant_status !== "Active")
      ) {
        await client.query("ROLLBACK");
        transactionStarted = false;
        return NextResponse.json(
          { error: `${itemName} is no longer available for borrowing.` },
          { status: 409 },
        );
      }

      borrowedItems.push({
        id: stock.id,
        variant_id: stock.variant_id ?? null,
        name: itemName,
        quantity: item.quantity,
      });
    }

    const loanResult = await client.query(
      `INSERT INTO loans (student_id, due_at, status)
       VALUES ($1, CURRENT_TIMESTAMP + ($2 * INTERVAL '1 day'), 'Active')
       RETURNING id AS loan_id, borrowed_at, due_at, remarks`,
      [studentId.trim(), dueDays],
    );
    const loan = loanResult.rows[0];

    for (const item of borrowedItems) {
      await client.query(
        "INSERT INTO loan_items (loan_id, apparatus_id, variant_id, quantity) VALUES ($1, $2, $3, $4)",
        [loan.loan_id, item.id, item.variant_id, item.quantity],
      );
      await client.query(
        item.variant_id
          ? "UPDATE apparatus_variants SET available_stock = available_stock - $1 WHERE id = $2"
          : "UPDATE apparatus SET available_stock = available_stock - $1 WHERE id = $2",
        [item.quantity, item.variant_id ?? item.id],
      );
    }

    await client.query(
      `INSERT INTO staff_notifications (event_type, student_id, message)
       VALUES ('Borrow', $1, $2)`,
      [
        studentId.trim(),
        `Borrower submitted a loan with ${borrowedItems
          .map((item) => `${item.quantity} × ${item.name}`)
          .join(", ")}.`,
      ],
    );
    await addStudentNotification(client, {
      studentId: studentId.trim(),
      eventType: "Borrow",
      message: `Your borrowing request was submitted for ${borrowedItems
        .map((item) => `${item.quantity} × ${item.name}`)
        .join(", ")}.`,
      href: "/catalog",
    });

    await client.query("COMMIT");
    transactionStarted = false;
    return NextResponse.json({
      loan_id: loan.loan_id,
      borrowed_at: loan.borrowed_at,
      due_at: loan.due_at,
      remarks: loan.remarks,
      items: borrowedItems,
    });
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Borrow Submit Rollback Error:", rollbackError);
      }
    }
    console.error("Borrow Submit Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit the borrowing request.",
      },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}
