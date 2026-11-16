import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import pool from "@/lib/db";

function isValidTimestamp(value: string | null): value is string {
  return value !== null && Number.isFinite(Date.parse(value));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const machine = searchParams.get("machine");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (
    !machine ||
    !isValidTimestamp(start) ||
    !isValidTimestamp(end) ||
    Date.parse(start) >= Date.parse(end)
  ) {
    return NextResponse.json(
      { error: "A machine and valid week range are required." },
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
         latest_request.status AS cancellation_status,
         latest_request.staff_note AS cancellation_staff_note
       FROM reservations r
       JOIN machines m ON m.id = r.machine_id
       JOIN students s ON s.student_id = r.student_id
       LEFT JOIN LATERAL (
         SELECT cr.status, cr.staff_note
         FROM reservation_cancellation_requests cr
         WHERE cr.reservation_id = r.id
         ORDER BY cr.created_at DESC
         LIMIT 1
       ) latest_request ON TRUE
       WHERE m.name = $1
         AND r.status = 'Booked'
         AND r.start_time >= $2::timestamptz
         AND r.start_time < $3::timestamptz
       ORDER BY r.start_time`,
      [machine, start, end],
    );

    return NextResponse.json(result.rows, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Unable to load machine reservations:", error);
    return NextResponse.json(
      { error: "Unable to load machine availability." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let client: PoolClient | undefined;
  let transactionStarted = false;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid reservation request." },
        { status: 400 },
      );
    }

    const machine = "machine" in body ? body.machine : undefined;
    const studentId = "student_id" in body ? body.student_id : undefined;
    const startTime = "start_time" in body ? body.start_time : undefined;
    const endTime = "end_time" in body ? body.end_time : undefined;

    if (
      typeof machine !== "string" ||
      typeof studentId !== "string" ||
      !studentId.trim() ||
      typeof startTime !== "string" ||
      typeof endTime !== "string" ||
      !Number.isFinite(Date.parse(startTime)) ||
      !Number.isFinite(Date.parse(endTime)) ||
      Date.parse(startTime) <= Date.now() ||
      Date.parse(endTime) - Date.parse(startTime) !== 60 * 60 * 1000
    ) {
      return NextResponse.json(
        { error: "Invalid reservation request." },
        { status: 400 },
      );
    }

    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const student = await client.query<{ student_id: string; full_name: string }>(
      "SELECT student_id, full_name FROM students WHERE student_id = $1",
      [studentId.trim()],
    );
    if (student.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "Student ID is not registered." },
        { status: 404 },
      );
    }

    const result = await client.query(
      `INSERT INTO reservations (machine_id, student_id, start_time, end_time)
       SELECT id, $2, $3::timestamptz, $4::timestamptz
       FROM machines
       WHERE name = $1 AND status = 'Active'
       RETURNING id, start_time, end_time, student_id`,
      [machine, studentId.trim(), startTime, endTime],
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "The selected machine is unavailable." },
        { status: 404 },
      );
    }

    await client.query(
      `INSERT INTO staff_notifications (event_type, student_id, message)
       VALUES ('Reservation', $1, $2)`,
      [
        studentId.trim(),
        `${student.rows[0].full_name} reserved ${machine} for ${new Date(startTime).toLocaleString()}.`,
      ],
    );
    await client.query("COMMIT");
    transactionStarted = false;
    return NextResponse.json(
      { ...result.rows[0], student_name: student.rows[0].full_name },
      { status: 201 },
    );
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Reservation Rollback Error:", rollbackError);
      }
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { error: "Time slot was just reserved by another user." },
        { status: 409 },
      );
    }

    console.error("Unable to create machine reservation:", error);
    return NextResponse.json(
      { error: "Unable to confirm this reservation." },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}
