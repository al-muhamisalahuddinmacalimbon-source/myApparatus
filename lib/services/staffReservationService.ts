import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import pool from "@/lib/db";
import { addStudentNotification } from "@/lib/services/studentNotificationWriter";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json(
      { error: "Invalid reservation ID." },
      { status: 400 },
    );
  }

  let client: PoolClient | undefined;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;
    const result = await client.query<{
      id: number;
      student_id: string;
      machine_name: string;
      start_time: Date;
    }>(
      `UPDATE reservations AS r
       SET status = 'Cancelled'
       FROM machines AS m
       WHERE r.id = $1
         AND r.machine_id = m.id
         AND r.status = 'Booked'
       RETURNING r.id, r.student_id, m.name AS machine_name, r.start_time`,
      [Number(id)],
    );

    const reservation = result.rows[0];
    if (!reservation) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "This reservation is no longer active." },
        { status: 404 },
      );
    }

    await addStudentNotification(client, {
      studentId: reservation.student_id,
      eventType: "Reservation Update",
      message: `Your reservation for ${reservation.machine_name} on ${reservation.start_time.toLocaleString()} was cancelled by staff.`,
      href: "/reserve",
    });
    await client.query("COMMIT");
    transactionStarted = false;
    return NextResponse.json({ id: reservation.id, status: "Cancelled" });
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Staff Reservation Cancellation Rollback Error:", rollbackError);
      }
    }
    console.error("Unable to cancel staff reservation:", error);
    return NextResponse.json(
      { error: "Unable to cancel this reservation." },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}
