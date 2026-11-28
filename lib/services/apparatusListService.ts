import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let query =
      `SELECT a.id, a.name, a.category, a.available_stock, a.total_stock, a.status, a.icon,
         COALESCE((
           SELECT json_agg(
             json_build_object(
               'id', v.id,
               'apparatus_id', v.apparatus_id,
               'name', v.name,
               'total_stock', v.total_stock,
               'available_stock', v.available_stock,
               'status', v.status,
               'created_at', v.created_at
             ) ORDER BY v.id
           )
           FROM apparatus_variants v
           WHERE v.apparatus_id = a.id
         ), '[]'::json) AS variants
       FROM apparatus a
       WHERE a.status = $1`;
    const queryParams: Array<string> = ["Active"];

    if (category && category !== 'All') {
      queryParams.push(category);
      query += ` AND a.category = $${queryParams.length}`;
    }

    if (search) {
      queryParams.push(`%${search}%`);
      query += ` AND (
        a.name ILIKE $${queryParams.length}
        OR EXISTS (
          SELECT 1
          FROM apparatus_variants matched_variant
          WHERE matched_variant.apparatus_id = a.id
            AND matched_variant.name ILIKE $${queryParams.length}
        )
      )`;
    }

    query += " ORDER BY a.id ASC";

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