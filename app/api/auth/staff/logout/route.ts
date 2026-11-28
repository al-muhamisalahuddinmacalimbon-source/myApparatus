import { NextResponse } from "next/server";
import { STAFF_SESSION_COOKIE } from "@/lib/auth/staffSession";

export async function POST() {
  const response = NextResponse.json({ loggedOut: true });
  response.cookies.set(STAFF_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
