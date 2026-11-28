import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import pool from "@/lib/db";
import { addStudentNotification } from "@/lib/services/studentNotificationWriter";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json({ error: "Invalid loan ID." }, { status: 400 });
  }

  let client: PoolClient | undefined;
  let transactionStarted = false;

  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const splitItems =
      body &&
      typeof body === "object" &&
      "items" in body &&
      Array.isArray(body.items)
        ? body.items
        : null;

    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const loanResult = await client.query<{
      id: number;
      student_id: string;
      status: string;
    }>(
      "SELECT id, student_id, status FROM loans WHERE id = $1 FOR UPDATE",
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
      loan_item_id: number;
      apparatus_id: number;
      variant_id: number | null;
      return_quantity: number;
    }>(
      `SELECT
         li.id AS loan_item_id,
         li.apparatus_id,
         li.variant_id,
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
      let goodQty = item.return_quantity;
      let damagedQty = 0;
      let lostQty = 0;
      let damageNotes: string | null = null;

      if (splitItems) {
        const split = splitItems.find(
          (candidate) =>
            candidate &&
            typeof candidate === "object" &&
            "loan_item_id" in candidate &&
            candidate.loan_item_id === item.loan_item_id,
        );
        if (!split) {
          await client.query("ROLLBACK");
          transactionStarted = false;
          return NextResponse.json(
            { error: "A return split is required for every selected loan item." },
            { status: 400 },
          );
        }
        const fields = split as Record<string, unknown>;
        if (
          typeof fields.good_qty !== "number" ||
          typeof fields.damaged_qty !== "number" ||
          typeof fields.lost_qty !== "number" ||
          !Number.isInteger(fields.good_qty) ||
          !Number.isInteger(fields.damaged_qty) ||
          !Number.isInteger(fields.lost_qty) ||
          fields.good_qty < 0 ||
          fields.damaged_qty < 0 ||
          fields.lost_qty < 0
        ) {
          await client.query("ROLLBACK");
          transactionStarted = false;
          return NextResponse.json(
            { error: "Good, damaged, and lost quantities must be nonnegative integers." },
            { status: 400 },
          );
        }
        goodQty = fields.good_qty;
        damagedQty = fields.damaged_qty;
        lostQty = fields.lost_qty;
        damageNotes =
          "damage_notes" in fields && typeof fields.damage_notes === "string"
            ? fields.damage_notes.trim() || null
            : null;
        if (goodQty + damagedQty + lostQty !== item.return_quantity) {
          await client.query("ROLLBACK");
          transactionStarted = false;
          return NextResponse.json(
            { error: "Good, damaged, and lost quantities must equal the returned quantity." },
            { status: 400 },
          );
        }
      }

      const apparatusResult = goodQty > 0
        ? item.variant_id
        ? await client.query(
            `UPDATE apparatus_variants
             SET available_stock = available_stock + $1
             WHERE id = $2
             RETURNING id`,
            [goodQty, item.variant_id],
          )
        : await client.query(
            `UPDATE apparatus
             SET available_stock = available_stock + $1
             WHERE id = $2
             RETURNING id`,
            [goodQty, item.apparatus_id],
          )
        : { rows: [{ id: item.apparatus_id }] };

      if (apparatusResult.rows.length === 0) {
        throw new Error(
          item.variant_id
            ? `Apparatus variant ${item.variant_id} was not found.`
            : `Apparatus ${item.apparatus_id} was not found.`,
        );
      }

      await client.query(
        `UPDATE loan_items
         SET returned_quantity = quantity,
             return_condition = CASE
               WHEN $2 > 0 THEN 'lost'
               WHEN $3 > 0 THEN 'damaged'
               ELSE 'good'
             END,
             damaged_qty = $3,
             lost_qty = $2,
             damage_notes = $4
         WHERE id = $1`,
        [
          item.loan_item_id,
          lostQty,
          damagedQty,
          damageNotes,
        ],
      );
    }

    await client.query(
      `UPDATE loans
       SET status = 'Returned', returned_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [Number(id)],
    );
    await addStudentNotification(client, {
      studentId: loanResult.rows[0].student_id,
      eventType: "Return",
      message: "Your borrowed equipment was marked as returned by staff.",
      href: "/catalog",
    });
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
