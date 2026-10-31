import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import pool from "@/lib/db";
import type {
  BorrowingHistoryItem,
  StudentBorrowingHistory,
} from "@/lib/mockLoans";

type HistoryLoanRow = {
  studentName: string;
  loanId: number | null;
  borrowedAt: Date | null;
  dueAt: Date | null;
  returnedAt: Date | null;
  loanStatus: "Active" | "Returned" | null;
  loanItemId: number | null;
  name: string | null;
  quantity: number | null;
  returnedQuantity: number | null;
  activeQuantity: number | null;
  overdue: boolean | null;
};

export async function GET(request: Request) {
  const studentId = new URL(request.url).searchParams.get("student_id")?.trim();
  if (!studentId) {
    return NextResponse.json(
      { error: "Student ID is required." },
      { status: 400 },
    );
  }

  try {
    const result = await pool.query<HistoryLoanRow>(
      `SELECT
         s.full_name AS "studentName",
         l.id AS "loanId",
         l.borrowed_at AS "borrowedAt",
         l.due_at AS "dueAt",
         l.returned_at AS "returnedAt",
         l.status AS "loanStatus",
         li.id AS "loanItemId",
         a.name,
         li.quantity::integer AS quantity,
         li.returned_quantity::integer AS "returnedQuantity",
         (li.quantity - li.returned_quantity)::integer AS "activeQuantity",
         (l.status = 'Active' AND l.due_at < NOW()) AS overdue
       FROM students s
       LEFT JOIN loans l
         ON l.student_id = s.student_id
       LEFT JOIN loan_items li ON li.loan_id = l.id
       LEFT JOIN apparatus a ON a.id = li.apparatus_id
       WHERE s.student_id = $1
       ORDER BY l.borrowed_at DESC NULLS LAST, li.id`,
      [studentId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Student ID was not found." }, { status: 404 });
    }

    const student: StudentBorrowingHistory = {
      studentId,
      studentName: result.rows[0].studentName,
      loans: [],
    };

    const loansById = new Map<
      number,
      StudentBorrowingHistory["loans"][number]
    >();
    for (const row of result.rows) {
      if (
        row.loanId === null ||
        row.borrowedAt === null ||
        row.dueAt === null ||
        row.loanStatus === null
      ) {
        continue;
      }

      let loan = loansById.get(row.loanId);
      if (!loan) {
        loan = {
          loanId: row.loanId,
          borrowedAt: row.borrowedAt.toISOString(),
          dueAt: row.dueAt.toISOString(),
          returnedAt: row.returnedAt?.toISOString() ?? null,
          status:
            row.loanStatus === "Returned"
              ? "Returned"
              : row.overdue
                ? "Overdue"
                : "Active",
          items: [],
        };
        loansById.set(row.loanId, loan);
        student.loans.push(loan);
      }

      if (
        row.loanItemId === null ||
        row.name === null ||
        row.quantity === null ||
        row.returnedQuantity === null ||
        row.activeQuantity === null
      ) {
        continue;
      }

      const item: BorrowingHistoryItem = {
        loanItemId: row.loanItemId,
        name: row.name,
        quantity: row.quantity,
        returnedQuantity: row.returnedQuantity,
        activeQuantity: row.activeQuantity,
      };
      loan.items.push(item);
    }

    return NextResponse.json(student, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Unable to load student active loans for return:", error);
    return NextResponse.json(
      { error: "Unable to load this student's active loans." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid return request." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("student_id" in body)) {
    return NextResponse.json({ error: "Invalid return request." }, { status: 400 });
  }

  const studentId = body.student_id;
  const itemIds = "item_ids" in body ? body.item_ids : undefined;
  if (
    typeof studentId !== "string" ||
    !studentId.trim() ||
    (itemIds !== undefined &&
      (!Array.isArray(itemIds) ||
        itemIds.length === 0 ||
        !itemIds.every(
          (itemId) =>
            typeof itemId === "number" &&
            Number.isInteger(itemId) &&
            itemId > 0,
        ) ||
        new Set(itemIds).size !== itemIds.length))
  ) {
    return NextResponse.json({ error: "Invalid return request." }, { status: 400 });
  }

  let client: PoolClient | undefined;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const studentResult = await client.query(
      "SELECT student_id FROM students WHERE student_id = $1",
      [studentId.trim()],
    );
    if (studentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json({ error: "Student ID was not found." }, { status: 404 });
    }

    const activeItemsResult = await client.query<{
      loan_id: number;
      loan_item_id: number;
      apparatus_id: number;
      quantity: number;
      returned_quantity: number;
    }>(
      `SELECT
         l.id AS loan_id,
         li.id AS loan_item_id,
         li.apparatus_id,
         li.quantity,
         li.returned_quantity
       FROM loans l
       JOIN loan_items li ON li.loan_id = l.id
       WHERE l.student_id = $1
         AND l.status = 'Active'
         AND li.quantity > li.returned_quantity
       ORDER BY l.id, li.id
       FOR UPDATE OF l, li`,
      [studentId.trim()],
    );

    const selectedRows =
      itemIds === undefined
        ? activeItemsResult.rows
        : activeItemsResult.rows.filter((row) =>
            itemIds.includes(row.loan_item_id),
          );
    if (
      selectedRows.length === 0 ||
      (itemIds !== undefined && selectedRows.length !== itemIds.length)
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "Selected equipment is no longer active for this student." },
        { status: 409 },
      );
    }

    const stockByApparatus = new Map<number, number>();
    const affectedLoanIds = new Set<number>();
    for (const row of selectedRows) {
      const remainingQuantity = row.quantity - row.returned_quantity;
      stockByApparatus.set(
        row.apparatus_id,
        (stockByApparatus.get(row.apparatus_id) ?? 0) + remainingQuantity,
      );
      affectedLoanIds.add(row.loan_id);
      await client.query(
        "UPDATE loan_items SET returned_quantity = quantity WHERE id = $1",
        [row.loan_item_id],
      );
    }

    for (const [apparatusId, quantity] of stockByApparatus) {
      await client.query(
        "UPDATE apparatus SET available_stock = available_stock + $1 WHERE id = $2",
        [quantity, apparatusId],
      );
    }

    for (const loanId of affectedLoanIds) {
      await client.query(
        `UPDATE loans
         SET status = 'Returned', returned_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND NOT EXISTS (
             SELECT 1
             FROM loan_items
             WHERE loan_id = $1
               AND quantity > returned_quantity
           )`,
        [loanId],
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;
    return NextResponse.json({
      returnedItemIds: selectedRows.map((row) => row.loan_item_id),
    });
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Partial Return Rollback Error:", rollbackError);
      }
    }
    console.error("Unable to process student equipment return:", error);
    return NextResponse.json(
      { error: "Unable to confirm this return." },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}
