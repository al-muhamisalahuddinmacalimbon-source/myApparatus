import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id.trim()) {
    return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT
         l.id AS loan_id,
         l.borrowed_at,
         l.due_at,
         CEIL(
           EXTRACT(EPOCH FROM (l.due_at - NOW())) / 86400
         )::integer AS days_until_due,
         json_agg(
           json_build_object(
             'name', a.name,
             'quantity', li.quantity - li.returned_quantity
           )
           ORDER BY a.name
         ) AS items
       FROM loans l
       JOIN loan_items li ON li.loan_id = l.id
       JOIN apparatus a ON a.id = li.apparatus_id
       WHERE l.student_id = $1
         AND l.status = 'Active'
         AND li.quantity > li.returned_quantity
       GROUP BY l.id
       ORDER BY l.borrowed_at DESC`,
      [id],
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Unable to load student borrowings:", error);
    return NextResponse.json(
      { error: "Unable to load your borrowed equipment." },
      { status: 500 },
    );
  }
}
