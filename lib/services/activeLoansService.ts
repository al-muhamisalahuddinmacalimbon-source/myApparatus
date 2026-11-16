import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { StaffLoan } from "@/types/reservation";

export async function GET() {
  try {
    const result = await pool.query<StaffLoan>(
      `SELECT
         l.id AS "loanId",
         s.student_id AS "studentId",
         s.full_name AS "studentName",
         json_agg(
           json_build_object(
             'name', a.name,
             'quantity', li.quantity - li.returned_quantity
           )
           ORDER BY a.name
         ) AS items,
         l.borrowed_at AS "borrowedAt",
         l.due_at AS "dueAt",
         CASE WHEN l.due_at < NOW() THEN 'Overdue' ELSE 'Active' END AS status,
         l.remarks
       FROM loans l
       JOIN students s ON s.student_id = l.student_id
       JOIN loan_items li ON li.loan_id = l.id
       JOIN apparatus a ON a.id = li.apparatus_id
       WHERE l.status = 'Active'
         AND li.quantity > li.returned_quantity
       GROUP BY l.id, s.student_id, s.full_name
       ORDER BY l.borrowed_at DESC`,
    );
    return NextResponse.json(result.rows, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Unable to load staff active loans:", error);
    return NextResponse.json(
      { error: "Unable to load active loans." },
      { status: 500 },
    );
  }
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json({ error: "Invalid loan ID." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid remark details." }, { status: 400 });
  }

  const remarks =
    body && typeof body === "object" && "remarks" in body
      ? body.remarks
      : undefined;
  if (typeof remarks !== "string" && remarks !== null) {
    return NextResponse.json(
      { error: "A remark string or null is required." },
      { status: 400 },
    );
  }

  try {
    const result = await pool.query<{ loanId: number; remarks: string | null }>(
      `UPDATE loans
       SET remarks = $1
       WHERE id = $2 AND status = 'Active'
       RETURNING id AS "loanId", remarks`,
      [typeof remarks === "string" ? remarks.trim() || null : null, Number(id)],
    );

    if (result.rows.length === 0) {
      const existingLoan = await pool.query<{ status: string }>(
        "SELECT status FROM loans WHERE id = $1",
        [Number(id)],
      );
      if (existingLoan.rows.length === 0) {
        return NextResponse.json({ error: "Loan not found." }, { status: 404 });
      }
      return NextResponse.json(
        { error: "Remarks can only be updated for active loans." },
        { status: 409 },
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Unable to update active loan remarks:", error);
    return NextResponse.json(
      { error: "Unable to update this loan's remarks." },
      { status: 500 },
    );
  }
}