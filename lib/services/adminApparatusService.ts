import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT a.id, a.name, a.category, a.total_stock, a.available_stock, a.status, a.icon,
         COALESCE((
           SELECT json_agg(
             json_build_object(
               'id', v.id,
               'apparatus_id', v.apparatus_id,
               'name', v.name,
               'total_stock', v.total_stock,
               'available_stock', v.available_stock,
               'status', v.status
             ) ORDER BY v.id
           )
           FROM apparatus_variants v
           WHERE v.apparatus_id = a.id
         ), '[]'::json) AS variants
       FROM apparatus a
       ORDER BY a.id`,
    );
    return NextResponse.json(result.rows, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Unable to load staff apparatus catalog:", error);
    return NextResponse.json(
      { error: "Unable to load apparatus from the database." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid apparatus details." }, { status: 400 });
  }

  if (
    !isApparatusInput(body) ||
    body.status !== "Active" ||
    body.available_stock !== body.total_stock
  ) {
    return NextResponse.json(
      { error: "Enter valid apparatus details. New apparatus starts active with all stock available." },
      { status: 400 },
    );
  }

  try {
    const result = await pool.query(
      `INSERT INTO apparatus
         (name, category, total_stock, available_stock, status, icon)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, category, total_stock, available_stock, status, icon`,
      [
        body.name.trim(),
        body.category,
        body.total_stock,
        body.available_stock,
        body.status,
        body.icon,
      ],
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Unable to create apparatus:", error);
    return NextResponse.json(
      { error: "Unable to add apparatus to the database." },
      { status: 500 },
    );
  }
}
