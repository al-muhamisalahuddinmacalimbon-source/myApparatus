import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import pool from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json({ error: "Invalid loan ID." }, { status: 400 });
  }

  let client: PoolClient | undefined;
  let transactionStarted = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const loanResult = await client.query(
      "SELECT id, status FROM loans WHERE id = $1 FOR UPDATE",
      [Number(id)],
    );

    if (loanResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json({ error: "Loan not found." }, { status: 404 });
    }

    if (loanResult.rows[0].status !== "Active") {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "This loan has already been returned." },
        { status: 409 },
      );
    }

    const itemsResult = await client.query<{
      apparatus_id: number;
      return_quantity: number;
    }>(
      `SELECT
         li.apparatus_id,
         (li.quantity - li.returned_quantity)::integer AS return_quantity
       FROM loan_items li
       WHERE li.loan_id = $1
         AND li.quantity > li.returned_quantity
       FOR UPDATE`,
      [Number(id)],
    );

    if (itemsResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "This loan has no equipment left to return." },
        { status: 409 },
      );
    }

    for (const item of itemsResult.rows) {
      const apparatusResult = await client.query(
        `UPDATE apparatus
         SET available_stock = available_stock + $1
         WHERE id = $2
         RETURNING id`,
        [item.return_quantity, item.apparatus_id],
      );

      if (apparatusResult.rows.length === 0) {
        throw new Error(`Apparatus ${item.apparatus_id} was not found.`);
      }

      await client.query(
        `UPDATE loan_items
         SET returned_quantity = quantity
         WHERE loan_id = $1 AND apparatus_id = $2`,
        [Number(id), item.apparatus_id],
      );
    }

    await client.query(
      `UPDATE loans
       SET status = 'Returned', returned_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [Number(id)],
    );
    await client.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json({ loanId: Number(id), status: "Returned" });
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Staff Return Rollback Error:", rollbackError);
      }
    }
    console.error("Unable to confirm equipment return:", error);
    return NextResponse.json(
      { error: "Unable to confirm this return." },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}
