import { NextResponse } from "next/server";
import pool from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!id.trim()) {
    return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT
         cr.id,
         cr.reservation_id,
         cr.reason,
         cr.status,
         cr.staff_note,
         cr.created_at,
         cr.reviewed_at,
         r.start_time,
         r.end_time,
         m.name AS machine_name
       FROM reservation_cancellation_requests cr
       JOIN reservations r ON r.id = cr.reservation_id
       JOIN machines m ON m.id = r.machine_id
       WHERE cr.student_id = $1
       ORDER BY cr.created_at DESC
       LIMIT 20`,
      [id],
    );
    return NextResponse.json(result.rows, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Unable to load student cancellation requests:", error);
    return NextResponse.json(
      { error: "Unable to load cancellation request updates." },
      { status: 500 },
    );
  }
}
