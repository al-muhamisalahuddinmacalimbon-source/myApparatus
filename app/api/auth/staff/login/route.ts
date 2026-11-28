import { NextRequest, NextResponse } from "next/server";
import {
  createStaffSession,
  STAFF_SESSION_COOKIE,
  verifyAdminCredentials,
} from "@/lib/auth/staffSession";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid login details." }, { status: 400 });
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("username" in body) ||
    !("password" in body) ||
    typeof body.username !== "string" ||
    typeof body.password !== "string" ||
    !body.username.trim() ||
    !body.password
  ) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 400 });
  }

  const staff = await verifyAdminCredentials(
    body.username.trim(),
    body.password,
  );
  if (!staff) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const token = await createStaffSession(staff);
  const response = NextResponse.json({
    id: staff.id,
    username: staff.username,
    role: "staff",
  });
  response.cookies.set(STAFF_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return response;
}
