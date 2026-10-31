import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import pool from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json(
      { error: "Invalid reservation ID." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "A Student ID and cancellation reason are required." },
      { status: 400 },
    );
  }

  const studentId =
    body && typeof body === "object" && "student_id" in body
      ? body.student_id
      : undefined;
  const reason =
    body && typeof body === "object" && "reason" in body
      ? body.reason
      : undefined;
  if (
    typeof studentId !== "string" ||
    !studentId.trim() ||
    typeof reason !== "string" ||
    !reason.trim() ||
    reason.trim().length > 1000
  ) {
    return NextResponse.json(
      { error: "Enter a cancellation reason (up to 1000 characters)." },
      { status: 400 },
    );
  }

  let client: PoolClient | undefined;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const reservationResult = await client.query<{
      id: number;
      student_id: string;
      machine_name: string;
      start_time: Date;
    }>(
      `SELECT r.id, r.student_id, m.name AS machine_name, r.start_time
       FROM reservations r
       JOIN machines m ON m.id = r.machine_id
       WHERE r.id = $1 AND r.status = 'Booked'
       FOR UPDATE OF r`,
      [Number(id)],
    );
    const reservation = reservationResult.rows[0];
    if (!reservation || reservation.student_id !== studentId.trim()) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "This reservation is unavailable or does not belong to you." },
        { status: 404 },
      );
    }

    const pendingResult = await client.query(
      `SELECT id
       FROM reservation_cancellation_requests
       WHERE reservation_id = $1 AND status = 'Pending'`,
      [Number(id)],
    );
    if (pendingResult.rowCount) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "A cancellation request is already pending for this reservation." },
        { status: 409 },
      );
    }

    const requestResult = await client.query<{ id: number }>(
      `INSERT INTO reservation_cancellation_requests
         (reservation_id, student_id, reason)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [Number(id), studentId.trim(), reason.trim()],
    );
    await client.query(
      `INSERT INTO staff_notifications (event_type, student_id, message)
       VALUES ('Cancellation Request', $1, $2)`,
      [
        studentId.trim(),
        `${reservation.machine_name} cancellation requested for ${reservation.start_time.toISOString()}.`,
      ],
    );
    await client.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json(
      { id: requestResult.rows[0].id, status: "Pending" },
      { status: 201 },
    );
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Cancellation Request Rollback Error:", rollbackError);
      }
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { error: "A cancellation request is already pending for this reservation." },
        { status: 409 },
      );
    }
    console.error("Unable to submit reservation cancellation request:", error);
    return NextResponse.json(
      { error: "Unable to submit this cancellation request." },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}
