import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id::text AS id, name
       FROM machines
       WHERE status = 'available'
       ORDER BY name, id`,
    );
    return NextResponse.json(result.rows, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Unable to load available machines:", error);
    return NextResponse.json(
      { error: "Unable to load available machines." },
      { status: 500 },
    );
  }
}
