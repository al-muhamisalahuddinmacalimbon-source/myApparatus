import { NextRequest, NextResponse } from "next/server";
import { getStaffSession, STAFF_SESSION_COOKIE } from "@/lib/auth/staffSession";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/staff/login")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/staff/") || pathname.startsWith("/api/admin/")) {
    const session = await getStaffSession(request);
    if (!session) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Staff authentication required." },
          { status: 401 },
        );
      }
      return new NextResponse("Staff authentication required.", { status: 401 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*", "/api/admin/:path*"],
};
