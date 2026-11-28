import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { mockStaff } from "@/lib/mockStaff";

export type StaffSession = {
  id: number;
  username: string;
  role: "staff";
  exp: number;
};

export const STAFF_SESSION_COOKIE = "staff_session";

function base64UrlEncode(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(
    binary,
    (character) => character.charCodeAt(0),
  );
  return bytes.buffer;
}

async function importKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signPayload(payload: StaffSession): Promise<string> {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) throw new Error("AUTH_SESSION_SECRET is not configured.");

  const encodedPayload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await importKey(secret),
    new TextEncoder().encode(encodedPayload),
  );
  return `${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string): Promise<StaffSession | null> {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) return null;

  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await importKey(secret),
      base64UrlDecode(encodedSignature),
      new TextEncoder().encode(encodedPayload),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(encodedPayload)),
    ) as StaffSession;
    if (
      typeof payload.id !== "number" ||
      typeof payload.username !== "string" ||
      payload.role !== "staff" ||
      typeof payload.exp !== "number" ||
      payload.exp <= Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function createStaffSession(staff: {
  id: number;
  username: string;
}) {
  const session: StaffSession = {
    id: staff.id,
    username: staff.username,
    role: "staff",
    exp: Date.now() + 8 * 60 * 60 * 1000,
  };
  return signPayload(session);
}

export async function getStaffSession(
  request: NextRequest | Request,
): Promise<StaffSession | null> {
  const token =
    "cookies" in request
      ? request.cookies.get(STAFF_SESSION_COOKIE)?.value
      : request.headers
          .get("cookie")
          ?.split(";")
          .map((value) => value.trim())
          .find((value) => value.startsWith(`${STAFF_SESSION_COOKIE}=`))
          ?.slice(STAFF_SESSION_COOKIE.length + 1);

  return token ? verifySessionToken(token) : null;
}

export async function requireStaffSession(
  request: NextRequest | Request,
): Promise<{ session: StaffSession } | { response: NextResponse }> {
  const session = await getStaffSession(request);
  if (!session) {
    return {
      response: NextResponse.json(
        { error: "Staff authentication required." },
        { status: 401 },
      ),
    };
  }
  if (session.role !== "staff") {
    return {
      response: NextResponse.json(
        { error: "Staff privileges required." },
        { status: 403 },
      ),
    };
  }
  return { session };
}

export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<{ id: number; username: string } | null> {
  try {
    const result = await pool.query<{
      id: number;
      username: string;
      password_hash: string;
    }>(
      "SELECT id, username, password_hash FROM admins WHERE lower(username) = lower($1)",
      [username],
    );
    const admin = result.rows[0];
    if (!admin) return null;

    const hash = admin.password_hash;
    const matches =
      hash.startsWith("$2")
        ? await bcrypt.compare(password, hash)
        : hash === password;

    return matches ? { id: admin.id, username: admin.username } : null;
  } catch (error) {
    console.warn("Database staff login unavailable; using local fallback.", error);
  }

  const fallback = mockStaff.find(
    (staff) => staff.username.toLowerCase() === username.toLowerCase(),
  );
  if (!fallback) return null;
  if (fallback.password === password) {
    return { id: 1, username: fallback.username };
  }
  if (fallback.password.startsWith("$2")) {
    const matches = await bcrypt.compare(password, fallback.password).catch(() => false);
    return matches ? { id: 1, username: fallback.username } : null;
  }
  return null;
}
