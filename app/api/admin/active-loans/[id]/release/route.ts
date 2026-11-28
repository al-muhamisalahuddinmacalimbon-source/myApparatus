import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireStaffSession } from "@/lib/auth/staffSession";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;

  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json({ error: "Invalid loan ID." }, { status: 400 });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const loan = await client.query<{
      id: number;
      status: string;
      instructor_endorsed: boolean;
      released_at: string | null;
    }>(
      `SELECT id, status, instructor_endorsed, released_at
       FROM loans
       WHERE id = $1
       FOR UPDATE`,
      [Number(id)],
    );
    if (loan.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Loan not found." }, { status: 404 });
    }
    const requestLoan = loan.rows[0];
    if (requestLoan.status !== "pending") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "This request is no longer pending approval." }, { status: 409 });
    }
    if (requestLoan.released_at) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "This request was already released." }, { status: 409 });
    }
    if (!requestLoan.instructor_endorsed) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Instructor endorsement is required before release." },
        { status: 409 },
      );
    }

    const items = await client.query<{
      id: number;
      apparatus_id: number;
      variant_id: number | null;
      quantity: number;
      returned_quantity: number;
    }>(
      `SELECT id, apparatus_id, variant_id, quantity, returned_quantity
       FROM loan_items
       WHERE loan_id = $1
       FOR UPDATE`,
      [Number(id)],
    );

    for (const item of items.rows) {
      const remaining = item.quantity - item.returned_quantity;
      if (remaining <= 0) continue;
      if (item.variant_id) {
        const stock = await client.query<{ available_stock: number }>(
          `SELECT available_stock
           FROM apparatus_variants
           WHERE id = $1
           FOR UPDATE`,
          [item.variant_id],
        );
        if (
          stock.rows.length === 0 ||
          stock.rows[0].available_stock < remaining
        ) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "Insufficient variant stock for release." },
            { status: 409 },
          );
        }
        await client.query(
          `UPDATE apparatus_variants
           SET available_stock = available_stock - $1
           WHERE id = $2`,
          [remaining, item.variant_id],
        );
      } else {
        const stock = await client.query<{ available_stock: number }>(
          `SELECT available_stock
           FROM apparatus
           WHERE id = $1
           FOR UPDATE`,
          [item.apparatus_id],
        );
        if (
          stock.rows.length === 0 ||
          stock.rows[0].available_stock < remaining
        ) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "Insufficient apparatus stock for release." },
            { status: 409 },
          );
        }
        await client.query(
          `UPDATE apparatus
           SET available_stock = available_stock - $1
           WHERE id = $2`,
          [remaining, item.apparatus_id],
        );
      }
    }

    await client.query(
      `UPDATE loans
       SET status = 'Active', released_at = CURRENT_TIMESTAMP, released_by = $1
       WHERE id = $2`,
      [guard.session.id, Number(id)],
    );
    await client.query("COMMIT");
    return NextResponse.json({ loanId: Number(id), status: "Active" });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => undefined);
    console.error("Unable to release approved borrow request:", error);
    return NextResponse.json(
      { error: "Unable to approve and release this request." },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}
