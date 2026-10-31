import { NextResponse } from "next/server";
import pool from "@/lib/db";

function isValidTimestamp(value: string | null): value is string {
  return value !== null && Number.isFinite(Date.parse(value));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const machine = searchParams.get("machine");

  if (
    !isValidTimestamp(start) ||
    !isValidTimestamp(end) ||
    Date.parse(start) >= Date.parse(end)
  ) {
    return NextResponse.json(
      { error: "A valid calendar date range is required." },
      { status: 400 },
    );
  }

  try {
    const result = await pool.query(
      `SELECT
         r.id,
         r.start_time,
         r.end_time,
         r.student_id,
         s.full_name AS student_name,
         m.name AS machine_name
       FROM reservations r
       JOIN students s ON s.student_id = r.student_id
       JOIN machines m ON m.id = r.machine_id
       WHERE r.status = 'Booked'
         AND r.start_time >= $1::timestamptz
         AND r.start_time < $2::timestamptz
         AND ($3::text IS NULL OR m.name = $3)
       ORDER BY r.start_time, m.name`,
      [start, end, machine || null],
    );

    return NextResponse.json(result.rows, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Unable to load staff reservations:", error);
    return NextResponse.json(
      { error: "Unable to load reservations." },
      { status: 500 },
    );
  }
}
