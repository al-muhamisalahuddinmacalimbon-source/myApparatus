import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireStaffSession } from "@/lib/auth/staffSession";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const guard = await requireStaffSession(request);
  if ("response" in guard) return guard.response;

  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json({ error: "Invalid loan ID." }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `UPDATE loans
       SET status = 'Returned', returned_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'Active' AND released_at IS NULL
       RETURNING id`,
      [Number(id)],
    );
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "This request cannot be rejected." },
        { status: 409 },
      );
    }
    return NextResponse.json({ loanId: Number(id), status: "Rejected" });
  } catch (error) {
    console.error("Unable to reject borrow request:", error);
    return NextResponse.json(
      { error: "Unable to reject this request." },
      { status: 500 },
    );
  }
}
