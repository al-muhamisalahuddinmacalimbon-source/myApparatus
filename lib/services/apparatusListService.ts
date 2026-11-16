import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let query =
      "SELECT id, name, category, available_stock, total_stock, status, icon FROM apparatus WHERE status = $1";
    const queryParams: Array<string> = ["Active"];

    if (category && category !== 'All') {
      queryParams.push(category);
      query += ` AND category = $${queryParams.length}`;
    }

    if (search) {
      queryParams.push(`%${search}%`);
      query += ` AND name ILIKE $${queryParams.length}`;
    }

    query += " ORDER BY id ASC";

    const result = await pool.query(query, queryParams);
    return NextResponse.json(result.rows, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Unable to load apparatus catalog:", error);
    return NextResponse.json(
      { error: "Unable to load equipment from the database." },
      { status: 500 },
    );
  }
}