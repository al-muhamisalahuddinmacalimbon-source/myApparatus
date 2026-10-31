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
      { error: "Invalid cancellation request ID." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid review details." }, { status: 400 });
  }
  const decision =
    body && typeof body === "object" && "decision" in body
      ? body.decision
      : undefined;
  const staffNote =
    body && typeof body === "object" && "staff_note" in body
      ? body.staff_note
      : "";
  if (
    (decision !== "Approved" && decision !== "Declined") ||
    typeof staffNote !== "string" ||
    staffNote.trim().length > 1000
  ) {
    return NextResponse.json({ error: "Invalid review details." }, { status: 400 });
  }

  let client: PoolClient | undefined;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const requestResult = await client.query<{
      reservation_id: number;
      student_id: string;
      status: string;
      machine_name: string;
      start_time: Date;
    }>(
      `SELECT
         cr.reservation_id,
         cr.student_id,
         cr.status,
         m.name AS machine_name,
         r.start_time
       FROM reservation_cancellation_requests cr
       JOIN reservations r ON r.id = cr.reservation_id
       JOIN machines m ON m.id = r.machine_id
       WHERE cr.id = $1
       FOR UPDATE OF cr, r`,
      [Number(id)],
    );
    const cancellationRequest = requestResult.rows[0];
    if (!cancellationRequest) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "Cancellation request was not found." },
        { status: 404 },
      );
    }
    if (cancellationRequest.status !== "Pending") {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "This cancellation request has already been reviewed." },
        { status: 409 },
      );
    }

    await client.query(
      `UPDATE reservation_cancellation_requests
       SET status = $1, staff_note = $2, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [decision, staffNote.trim() || null, Number(id)],
    );
    if (decision === "Approved") {
      await client.query(
        `UPDATE reservations SET status = 'Cancelled'
         WHERE id = $1 AND status = 'Booked'`,
        [cancellationRequest.reservation_id],
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json({
      id: Number(id),
      status: decision,
      staffNote: staffNote.trim() || null,
    });
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Cancellation Review Rollback Error:", rollbackError);
      }
    }
    console.error("Unable to review reservation cancellation request:", error);
    return NextResponse.json(
      { error: "Unable to review this cancellation request." },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}
