import { NextResponse } from "next/server";
import pool from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const studentId = id.trim();

  if (!studentId) {
    return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
  }

  try {
    const [overdueResult, dueSoonResult, reservationResult] = await Promise.all([
      pool.query(
        `SELECT
           l.id AS loan_id,
           l.due_at,
           SUM(li.quantity - li.returned_quantity)::integer AS item_count,
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
           AND l.due_at < NOW()
           AND li.quantity > li.returned_quantity
         GROUP BY l.id
         ORDER BY l.due_at`,
        [studentId],
      ),
      pool.query(
        `SELECT
           l.id AS loan_id,
           l.due_at,
           SUM(li.quantity - li.returned_quantity)::integer AS item_count,
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
           AND l.due_at >= NOW()
           AND l.due_at <= NOW() + INTERVAL '3 days'
           AND li.quantity > li.returned_quantity
         GROUP BY l.id
         ORDER BY l.due_at`,
        [studentId],
      ),
      pool.query(
        `SELECT
           r.id,
           m.name AS machine_name,
           r.start_time,
           r.end_time
         FROM reservations r
         JOIN machines m ON m.id = r.machine_id
         WHERE r.student_id = $1
           AND r.status = 'Booked'
           AND r.start_time >= NOW()
         ORDER BY r.start_time
         LIMIT 5`,
        [studentId],
      ),
    ]);

    return NextResponse.json(
      {
        overdueLoans: overdueResult.rows,
        dueSoonLoans: dueSoonResult.rows,
        upcomingReservations: reservationResult.rows,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Unable to load student dashboard activity:", error);
    return NextResponse.json(
      { error: "Unable to load your borrowing and reservation activity." },
      { status: 500 },
    );
  }
}
