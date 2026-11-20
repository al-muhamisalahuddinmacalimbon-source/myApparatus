import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import pool from "@/lib/db";
import type { StaffLoan } from "@/types/reservation";

export async function GET() {
  try {
    const result = await pool.query<StaffLoan>(
      `SELECT
         l.id AS "loanId",
         s.student_id AS "studentId",
         s.full_name AS "studentName",
         json_agg(
           json_build_object(
             'name', CASE
               WHEN v.id IS NULL THEN a.name
               ELSE a.name || ' (' || v.name || ')'
             END,
             'quantity', li.quantity - li.returned_quantity,
             'variant_id', li.variant_id
           )
           ORDER BY a.name
         ) AS items,
         l.borrowed_at AS "borrowedAt",
         l.due_at AS "dueAt",
         CASE WHEN l.due_at < NOW() THEN 'Overdue' ELSE 'Active' END AS status,
         l.remarks
       FROM loans l
       JOIN students s ON s.student_id = l.student_id
       JOIN loan_items li ON li.loan_id = l.id
       JOIN apparatus a ON a.id = li.apparatus_id
       LEFT JOIN apparatus_variants v ON v.id = li.variant_id
       WHERE l.status = 'Active'
         AND li.quantity > li.returned_quantity
       GROUP BY l.id, s.student_id, s.full_name
       ORDER BY l.borrowed_at DESC`,
    );
    return NextResponse.json(result.rows, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Unable to load staff active loans:", error);
    return NextResponse.json(
      { error: "Unable to load active loans." },
      { status: 500 },
    );
  }
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

type VariantSelection = {
  loan_item_id: number;
  variant_id: number;
};

function isVariantSelection(value: unknown): value is VariantSelection {
  if (!value || typeof value !== "object") return false;
  return (
    "loan_item_id" in value &&
    typeof value.loan_item_id === "number" &&
    Number.isInteger(value.loan_item_id) &&
    value.loan_item_id > 0 &&
    "variant_id" in value &&
    typeof value.variant_id === "number" &&
    Number.isInteger(value.variant_id) &&
    value.variant_id > 0
  );
}

function isVariantSelectionArray(value: unknown): value is VariantSelection[] {
  return Array.isArray(value) && value.every(isVariantSelection);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json({ error: "Invalid loan ID." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid remark details." }, { status: 400 });
  }

  const remarks =
    body && typeof body === "object" && "remarks" in body
      ? body.remarks
      : undefined;
  const rawItems =
    body && typeof body === "object" && "items" in body ? body.items : undefined;
  const items =
    rawItems === undefined
      ? undefined
      : isVariantSelectionArray(rawItems)
        ? rawItems
        : null;
  if (
    (remarks !== undefined &&
      typeof remarks !== "string" &&
      remarks !== null) ||
    items === null ||
    (items !== undefined &&
      (items.length === 0 ||
        new Set(items.map((item) => item.loan_item_id)).size !==
          items.length)) ||
    (remarks === undefined && rawItems === undefined)
  ) {
    return NextResponse.json(
      { error: "Provide valid loan remarks or variant selections." },
      { status: 400 },
    );
  }

  if (items !== undefined && items !== null) {
    let client: PoolClient | undefined;
    let transactionStarted = false;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      transactionStarted = true;

      const loanResult = await client.query<{ status: string }>(
        "SELECT status FROM loans WHERE id = $1 FOR UPDATE",
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
          { error: "Only active loans can be edited." },
          { status: 409 },
        );
      }

      const itemIds = items.map((item) => item.loan_item_id);
      const loanItemsResult = await client.query<{
        id: number;
        apparatus_id: number;
        variant_id: number | null;
        quantity: number;
        returned_quantity: number;
      }>(
        `SELECT id, apparatus_id, variant_id, quantity, returned_quantity
         FROM loan_items
         WHERE loan_id = $1 AND id = ANY($2::integer[])
         FOR UPDATE`,
        [Number(id), itemIds],
      );
      if (
        loanItemsResult.rows.length !== items.length ||
        loanItemsResult.rows.some((item) => item.returned_quantity > 0)
      ) {
        await client.query("ROLLBACK");
        transactionStarted = false;
        return NextResponse.json(
          { error: "Only fully unreturned items on this loan can be changed." },
          { status: 409 },
        );
      }

      const variantIds = Array.from(
        new Set([
          ...loanItemsResult.rows.flatMap((item) =>
            item.variant_id === null ? [] : [item.variant_id],
          ),
          ...items.map((item) => item.variant_id),
        ]),
      ).sort((left, right) => left - right);
      const variantsResult = await client.query<{
        id: number;
        apparatus_id: number;
        available_stock: number;
        total_stock: number;
        name: string;
        status: string;
      }>(
        `SELECT id, apparatus_id, available_stock, total_stock, name, status
         FROM apparatus_variants
         WHERE id = ANY($1::integer[])
         ORDER BY id
         FOR UPDATE`,
        [variantIds],
      );
      if (variantsResult.rows.length !== variantIds.length) {
        await client.query("ROLLBACK");
        transactionStarted = false;
        return NextResponse.json(
          { error: "One or more selected apparatus variants were not found." },
          { status: 400 },
        );
      }

      const variantsById = new Map(
        variantsResult.rows.map((variant) => [variant.id, variant]),
      );
      const stockDeltas = new Map<number, number>();
      const addStockDelta = (variantId: number, delta: number) => {
        stockDeltas.set(
          variantId,
          (stockDeltas.get(variantId) ?? 0) + delta,
        );
      };

      for (const loanItem of loanItemsResult.rows) {
        const selection = items.find(
          (item) => item.loan_item_id === loanItem.id,
        );
        if (!selection) {
          throw new Error(`Missing selection for loan item ${loanItem.id}.`);
        }
        const nextVariant = variantsById.get(selection.variant_id);
        if (!nextVariant || nextVariant.apparatus_id !== loanItem.apparatus_id) {
          await client.query("ROLLBACK");
          transactionStarted = false;
          return NextResponse.json(
            { error: "The selected variant does not belong to this apparatus." },
            { status: 400 },
          );
        }
        if (nextVariant.status !== "Active") {
          await client.query("ROLLBACK");
          transactionStarted = false;
          return NextResponse.json(
            { error: `${nextVariant.name} is no longer available.` },
            { status: 409 },
          );
        }
        if (loanItem.variant_id === selection.variant_id) continue;

        if (loanItem.variant_id !== null) {
          addStockDelta(loanItem.variant_id, loanItem.quantity);
        }
        addStockDelta(selection.variant_id, -loanItem.quantity);
      }

      for (const [variantId, delta] of stockDeltas) {
        const variant = variantsById.get(variantId);
        if (!variant) {
          throw new Error(`Apparatus variant ${variantId} was not found.`);
        }
        const nextAvailableStock = variant.available_stock + delta;
        if (nextAvailableStock < 0) {
          await client.query("ROLLBACK");
          transactionStarted = false;
          return NextResponse.json(
            { error: `Insufficient stock for ${variant.name}.` },
            { status: 409 },
          );
        }
        if (nextAvailableStock > variant.total_stock) {
          await client.query("ROLLBACK");
          transactionStarted = false;
          return NextResponse.json(
            {
              error: `Available stock for ${variant.name} exceeds its total stock.`,
            },
            { status: 409 },
          );
        }
      }

      for (const [variantId, delta] of stockDeltas) {
        await client.query(
          `UPDATE apparatus_variants
           SET available_stock = available_stock + $1
           WHERE id = $2`,
          [delta, variantId],
        );
      }
      for (const loanItem of loanItemsResult.rows) {
        const selection = items.find(
          (item) => item.loan_item_id === loanItem.id,
        );
        if (!selection || loanItem.variant_id === selection.variant_id) continue;
        if (loanItem.variant_id === null) {
          await client.query(
            `UPDATE apparatus
             SET available_stock = available_stock + $1
             WHERE id = $2`,
            [loanItem.quantity, loanItem.apparatus_id],
          );
        }
        await client.query(
          "UPDATE loan_items SET variant_id = $1 WHERE id = $2",
          [selection.variant_id, loanItem.id],
        );
      }

      if (remarks !== undefined) {
        await client.query(
          "UPDATE loans SET remarks = $1 WHERE id = $2",
          [
            typeof remarks === "string" ? remarks.trim() || null : null,
            Number(id),
          ],
        );
      }

      await client.query("COMMIT");
      transactionStarted = false;
      return NextResponse.json({
        loanId: Number(id),
        updatedItemIds: itemIds,
      });
    } catch (error) {
      if (transactionStarted && client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Active loan edit rollback failed:", rollbackError);
        }
      }
      console.error("Unable to update active loan items:", error);
      return NextResponse.json(
        { error: "Unable to update active loan items." },
        { status: 500 },
      );
    } finally {
      client?.release();
    }
  }

  if (remarks === undefined) {
    return NextResponse.json(
      { error: "A remark string or null is required." },
      { status: 400 },
    );
  }

  try {
    const result = await pool.query<{ loanId: number; remarks: string | null }>(
      `UPDATE loans
       SET remarks = $1
       WHERE id = $2 AND status = 'Active'
       RETURNING id AS "loanId", remarks`,
      [typeof remarks === "string" ? remarks.trim() || null : null, Number(id)],
    );

    if (result.rows.length === 0) {
      const existingLoan = await pool.query<{ status: string }>(
        "SELECT status FROM loans WHERE id = $1",
        [Number(id)],
      );
      if (existingLoan.rows.length === 0) {
        return NextResponse.json({ error: "Loan not found." }, { status: 404 });
      }
      return NextResponse.json(
        { error: "Remarks can only be updated for active loans." },
        { status: 409 },
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Unable to update active loan remarks:", error);
    return NextResponse.json(
      { error: "Unable to update this loan's remarks." },
      { status: 500 },
    );
  }
}