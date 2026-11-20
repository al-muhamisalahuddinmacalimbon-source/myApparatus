import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import pool from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string; variantId: string }>;
};

type VariantInput = {
  name: string;
  total_stock: number;
  available_stock: number;
  status: "Active" | "Inactive";
};

function isVariantInput(value: unknown): value is VariantInput {
  if (!value || typeof value !== "object") return false;
  return (
    "name" in value &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    value.name.trim().length <= 120 &&
    "total_stock" in value &&
    typeof value.total_stock === "number" &&
    Number.isInteger(value.total_stock) &&
    value.total_stock >= 0 &&
    "available_stock" in value &&
    typeof value.available_stock === "number" &&
    Number.isInteger(value.available_stock) &&
    value.available_stock >= 0 &&
    value.available_stock <= value.total_stock &&
    "status" in value &&
    (value.status === "Active" || value.status === "Inactive")
  );
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id, variantId } = await params;
  if (!/^[1-9]\d*$/.test(id) || !/^[1-9]\d*$/.test(variantId)) {
    return NextResponse.json(
      { error: "Invalid apparatus or variant ID." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid variant details." }, { status: 400 });
  }
  if (!isVariantInput(body)) {
    return NextResponse.json(
      { error: "Enter a valid variant name, stock counts, and status." },
      { status: 400 },
    );
  }

  let client: PoolClient | undefined;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const variantResult = await client.query<{ id: number }>(
      `SELECT id
       FROM apparatus_variants
       WHERE id = $1 AND apparatus_id = $2
       FOR UPDATE`,
      [Number(variantId), Number(id)],
    );
    if (variantResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json({ error: "Apparatus variant was not found." }, {
        status: 404,
      });
    }

    const borrowedResult = await client.query<{ quantity: number }>(
      `SELECT COALESCE(SUM(li.quantity - li.returned_quantity), 0)::integer AS quantity
       FROM loan_items li
       JOIN loans l ON l.id = li.loan_id
       WHERE li.variant_id = $1
         AND l.status = 'Active'
         AND li.quantity > li.returned_quantity`,
      [Number(variantId)],
    );
    if (
      body.available_stock + borrowedResult.rows[0].quantity >
      body.total_stock
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        {
          error:
            "Available stock plus this variant's active loans cannot exceed its total stock.",
        },
        { status: 409 },
      );
    }

    const result = await client.query(
      `UPDATE apparatus_variants
       SET name = $1,
           total_stock = $2,
           available_stock = $3,
           status = $4
       WHERE id = $5 AND apparatus_id = $6
       RETURNING id, apparatus_id, name, total_stock, available_stock, status`,
      [
        body.name.trim(),
        body.total_stock,
        body.available_stock,
        body.status,
        Number(variantId),
        Number(id),
      ],
    );

    await client.query("COMMIT");
    transactionStarted = false;
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Apparatus variant update rollback failed:", rollbackError);
      }
    }
    console.error("Unable to update apparatus variant:", error);
    return NextResponse.json(
      { error: "Unable to update apparatus variant." },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}
