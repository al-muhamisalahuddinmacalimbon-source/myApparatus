import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

function isValidTimeZone(value: string | null): value is string {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeZone = searchParams.get("timeZone");

  if (!isValidTimeZone(timeZone)) {
    return NextResponse.json(
      { error: "Enter a valid device timezone." },
      { status: 400 },
    );
  }

  try {
    const result = await pool.query(
      `SELECT
         s.student_id,
         s.full_name AS student_name,
         a.name AS item_name,
         (li.quantity - li.returned_quantity)::integer AS quantity,
         to_char(timezone($1, l.borrowed_at)::date, 'YYYY-MM-DD') AS borrowed_date,
         CASE
           WHEN l.due_at <= NOW() THEN GREATEST(
             1,
             ABS(
               CEIL(
                 EXTRACT(EPOCH FROM (l.due_at - NOW())) / 86400
               )::integer
             )
           )
           ELSE 0
         END AS days_overdue
       FROM loans l
       JOIN students s ON s.student_id = l.student_id
       JOIN loan_items li ON li.loan_id = l.id
       JOIN apparatus a ON a.id = li.apparatus_id
       WHERE l.status = 'Active'
         AND li.quantity > li.returned_quantity
         AND l.due_at <= NOW()
       ORDER BY s.full_name, l.borrowed_at, a.name`,
      [timeZone],
    );

    return NextResponse.json(result.rows, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Unable to generate liability report:", error);
    return NextResponse.json(
      { error: "Unable to generate the liability report." },
      { status: 500 },
    );
  }
}
