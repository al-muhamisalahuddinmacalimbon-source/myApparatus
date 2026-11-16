import { NextResponse } from "next/server";
import pool from "@/lib/db";

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

  try {
    const result = await pool.query(
      `UPDATE reservations
       SET status = 'Cancelled'
       WHERE id = $1 AND status = 'Booked'
       RETURNING id`,
      [Number(id)],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "This reservation is no longer active." },
        { status: 404 },
      );
    }

    return NextResponse.json({ id: Number(id), status: "Cancelled" });
  } catch (error) {
    console.error("Unable to cancel staff reservation:", error);
    return NextResponse.json(
      { error: "Unable to cancel this reservation." },
      { status: 500 },
    );
  }
}
