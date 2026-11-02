import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, title, category, body, pinned, created_at
       FROM lab_notices
       ORDER BY pinned DESC, created_at DESC`,
    );
    return NextResponse.json(result.rows, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Unable to load lab notices:", error);
    return NextResponse.json(
      { error: "Unable to load lab notices." },
      { status: 500 },
    );
  }
}
