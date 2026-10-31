import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { StaffLoan } from "@/lib/mockLoans";

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
         CASE WHEN l.due_at < NOW() THEN 'Overdue' ELSE 'Active' END AS status
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