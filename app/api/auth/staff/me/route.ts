import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/auth/staffSession";

export async function GET(request: NextRequest) {
  const session = await getStaffSession(request);
  if (!session) {
    return NextResponse.json({ error: "Staff authentication required." }, { status: 401 });
  }
  return NextResponse.json({
    id: session.id,
    username: session.username,
    role: session.role,
  });
}
