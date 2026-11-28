import { NextResponse } from "next/server";
import pool from "@/lib/db";
import {
  endorseMockBorrowRequest,
  getMockBorrowRequest,
  isDatabaseUnavailable,
} from "@/lib/services/borrowRequestFallback";

function isToken(value: string | null): value is string {
  return value !== null &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!isToken(token)) {
    return NextResponse.json({ error: "Valid endorsement token is required." }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT
         l.id AS loan_id,
         l.student_id,
         s.full_name AS student_name,
         l.subject_name,
         l.instructor_name,
         l.instructor_endorsed,
         l.instructor_signature_data,
         l.endorsed_at,
         l.remarks,
         l.status,
         COALESCE(
           json_agg(
             json_build_object(
               'loan_item_id', li.id,
               'apparatus_id', a.id,
               'variant_id', v.id,
               'apparatus_name', a.name,
               'variant_name', v.name,
               'name', CASE WHEN v.id IS NULL THEN a.name ELSE a.name || ' (' || v.name || ')' END,
               'quantity', li.quantity
             ) ORDER BY li.id
           ) FILTER (WHERE li.id IS NOT NULL),
           '[]'::json
         ) AS items
       FROM loans l
       JOIN students s ON s.student_id = l.student_id
       LEFT JOIN loan_items li ON li.loan_id = l.id
       LEFT JOIN apparatus a ON a.id = li.apparatus_id
       LEFT JOIN apparatus_variants v ON v.id = li.variant_id
       WHERE l.endorsement_token = $1
       GROUP BY l.id, s.student_id, s.full_name`,
      [token],
    );
    if (result.rows[0]) {
      return NextResponse.json(result.rows[0], {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }
  } catch (error) {
    console.error("Unable to load endorsement request from database; using mock fallback.", error);
    if (!isDatabaseUnavailable(error)) {
      return NextResponse.json(
        { error: "Unable to load endorsement request." },
        { status: 500 },
      );
    }
  }

  const mockRequest = getMockBorrowRequest(token);
  if (mockRequest) {
    return NextResponse.json(mockRequest, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
  return NextResponse.json({ error: "Endorsement request not found." }, { status: 404 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid endorsement details." }, { status: 400 });
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("endorsement_token" in body) ||
    typeof body.endorsement_token !== "string" ||
    !isToken(body.endorsement_token) ||
    !("instructor_name" in body) ||
    typeof body.instructor_name !== "string" ||
    !body.instructor_name.trim() ||
    body.instructor_name.trim().length > 120 ||
    !("instructor_signature_data" in body) ||
    typeof body.instructor_signature_data !== "string" ||
    !body.instructor_signature_data.trim() ||
    body.instructor_signature_data.length > 200000 ||
    !("endorsement_method" in body) ||
    (body.endorsement_method !== "digital" && body.endorsement_method !== "in_person")
  ) {
    return NextResponse.json({ error: "Instructor name and signature are required." }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `UPDATE loans
       SET instructor_name = $1,
           instructor_endorsed = TRUE,
           endorsement_method = $2,
           instructor_signature_data = $3,
           endorsed_at = CURRENT_TIMESTAMP
       WHERE endorsement_token = $4
         AND status = 'pending'
         AND instructor_endorsed = FALSE
       RETURNING id AS loan_id, instructor_endorsed, endorsed_at`,
      [
        body.instructor_name.trim(),
        body.endorsement_method,
        body.instructor_signature_data,
        body.endorsement_token,
      ],
    );
    if (result.rows[0]) return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Unable to record instructor endorsement; using mock fallback.", error);
    if (!isDatabaseUnavailable(error)) {
      return NextResponse.json(
        { error: "Unable to record instructor endorsement." },
        { status: 500 },
      );
    }
  }

  const mockRequest = endorseMockBorrowRequest(
    body.endorsement_token,
    body.instructor_name.trim(),
    body.instructor_signature_data,
  );
  if (!mockRequest) {
    return NextResponse.json({ error: "Endorsement request not found or already signed." }, { status: 404 });
  }
  return NextResponse.json({
    loan_id: mockRequest.loan_id,
    instructor_endorsed: true,
    endorsed_at: mockRequest.endorsed_at,
    mock_fallback: true,
  });
}
