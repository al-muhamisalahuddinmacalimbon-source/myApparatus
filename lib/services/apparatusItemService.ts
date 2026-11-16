import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import pool from "@/lib/db";

const categories = ["Glassware", "Electronics", "Tools", "Machines", "Safety"];
const icons = [
  "flask-conical",
  "beaker",
  "pipette",
  "gauge",
  "zap",
  "plug",
  "wrench",
  "ruler",
  "settings",
  "microscope",
  "cable",
  "scale",
  "help",
];

type ApparatusInput = {
  name: string;
  category: string;
  total_stock: number;
  available_stock: number;
  status: "Active" | "Inactive";
  icon: string;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isApparatusInput(value: unknown): value is ApparatusInput {
  if (!value || typeof value !== "object") return false;
  return (
    "name" in value &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    value.name.trim().length <= 120 &&
    "category" in value &&
    typeof value.category === "string" &&
    categories.includes(value.category) &&
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
    (value.status === "Active" || value.status === "Inactive") &&
    "icon" in value &&
    typeof value.icon === "string" &&
    icons.includes(value.icon)
  );
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json({ error: "Invalid apparatus ID." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid apparatus details." }, { status: 400 });
  }
  if (!isApparatusInput(body)) {
    return NextResponse.json(
      { error: "Enter a valid name, category, stock counts, status, and icon." },
      { status: 400 },
    );
  }

  let client: PoolClient | undefined;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const currentResult = await client.query(
      "SELECT id FROM apparatus WHERE id = $1 FOR UPDATE",
      [Number(id)],
    );
    if (currentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json({ error: "Apparatus was not found." }, { status: 404 });
    }

    const borrowedResult = await client.query<{ quantity: number }>(
      `SELECT COALESCE(SUM(li.quantity - li.returned_quantity), 0)::integer AS quantity
       FROM loan_items li
       JOIN loans l ON l.id = li.loan_id
       WHERE li.apparatus_id = $1
         AND l.status = 'Active'
         AND li.quantity > li.returned_quantity`,
      [Number(id)],
    );
    const borrowedQuantity = borrowedResult.rows[0].quantity;
    if (body.available_stock + borrowedQuantity > body.total_stock) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        {
          error:
            "Available stock plus apparatus currently on active loans cannot exceed total stock.",
        },
        { status: 409 },
      );
    }

    const result = await client.query(
      `UPDATE apparatus
       SET name = $1,
           category = $2,
           total_stock = $3,
           available_stock = $4,
           status = $5,
           icon = $6
       WHERE id = $7
       RETURNING id, name, category, total_stock, available_stock, status, icon`,
      [
        body.name.trim(),
        body.category,
        body.total_stock,
        body.available_stock,
        body.status,
        body.icon,
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
        console.error("Apparatus update rollback failed:", rollbackError);
      }
    }
    console.error("Unable to update apparatus:", error);
    return NextResponse.json(
      { error: "Unable to update apparatus in the database." },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}
