import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import pool from "@/lib/db";

type BorrowItem = {
  id: number;
  quantity: number;
};

function isBorrowItem(value: unknown): value is BorrowItem {
  if (!value || typeof value !== "object") return false;
  return (
    "id" in value &&
    typeof value.id === "number" &&
    Number.isInteger(value.id) &&
    value.id > 0 &&
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
      new Set(items.map((item) => item.id)).size !== items.length ||
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
      name: string;
      quantity: number;
    }> = [];

    for (const item of items) {
      const stockCheck = await client.query(
        "SELECT available_stock, name FROM apparatus WHERE id = $1 FOR UPDATE",
        [item.id],
      );

      if (stockCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        transactionStarted = false;
        return NextResponse.json(
          { error: `Apparatus ID ${item.id} not found` },
          { status: 400 },
        );
      }

      if (stockCheck.rows[0].available_stock < item.quantity) {
        await client.query("ROLLBACK");
        transactionStarted = false;
        return NextResponse.json(
          { error: `Insufficient stock for ${stockCheck.rows[0].name}` },
          { status: 400 },
        );
      }

      borrowedItems.push({
        id: item.id,
        name: stockCheck.rows[0].name,
        quantity: item.quantity,
      });
    }

    const loanResult = await client.query(
      `INSERT INTO loans (student_id, due_at, status)
       VALUES ($1, CURRENT_TIMESTAMP + ($2 * INTERVAL '1 day'), 'Active')
       RETURNING id AS loan_id, borrowed_at, due_at`,
      [studentId.trim(), dueDays],
    );
    const loan = loanResult.rows[0];

    for (const item of borrowedItems) {
      await client.query(
        "INSERT INTO loan_items (loan_id, apparatus_id, quantity) VALUES ($1, $2, $3)",
        [loan.loan_id, item.id, item.quantity],
      );
      await client.query(
        "UPDATE apparatus SET available_stock = available_stock - $1 WHERE id = $2",
        [item.quantity, item.id],
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;
    return NextResponse.json({
      loan_id: loan.loan_id,
      borrowed_at: loan.borrowed_at,
      due_at: loan.due_at,
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
