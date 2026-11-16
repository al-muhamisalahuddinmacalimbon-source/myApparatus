import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT
         cr.id,
         cr.reservation_id,
         cr.student_id,
         s.full_name AS student_name,
         cr.reason,
         cr.status,
         cr.staff_note,
         cr.created_at,
         cr.reviewed_at,
         r.start_time,
         r.end_time,
         m.name AS machine_name
       FROM reservation_cancellation_requests cr
       JOIN students s ON s.student_id = cr.student_id
       JOIN reservations r ON r.id = cr.reservation_id
       JOIN machines m ON m.id = r.machine_id
       ORDER BY
         CASE WHEN cr.status = 'Pending' THEN 0 ELSE 1 END,
         cr.created_at DESC
       LIMIT 100`,
    );
    return NextResponse.json(result.rows, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Unable to load reservation cancellation requests:", error);
    return NextResponse.json(
      { error: "Unable to load cancellation requests." },
      { status: 500 },
    );
  }
}
