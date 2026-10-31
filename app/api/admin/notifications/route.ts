import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT
         n.id,
         n.event_type,
         n.student_id,
         s.full_name AS student_name,
         n.message,
         n.created_at,
         n.read_at
       FROM staff_notifications n
       JOIN students s ON s.student_id = n.student_id
       ORDER BY n.created_at DESC
       LIMIT 100`,
    );
    const unreadResult = await pool.query(
      "SELECT COUNT(*)::integer AS count FROM staff_notifications WHERE read_at IS NULL",
    );
    return NextResponse.json(
      { notifications: result.rows, unreadCount: unreadResult.rows[0].count },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Unable to load staff notifications:", error);
    return NextResponse.json(
      { error: "Unable to load staff notifications." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid notification update." }, { status: 400 });
  }

  const notificationId =
    body && typeof body === "object" && "id" in body ? body.id : undefined;
  if (
    notificationId !== undefined &&
    (typeof notificationId !== "number" ||
      !Number.isInteger(notificationId) ||
      notificationId < 1)
  ) {
    return NextResponse.json({ error: "Invalid notification ID." }, { status: 400 });
  }

  try {
    if (notificationId === undefined) {
      await pool.query(
        "UPDATE staff_notifications SET read_at = CURRENT_TIMESTAMP WHERE read_at IS NULL",
      );
    } else {
      await pool.query(
        "UPDATE staff_notifications SET read_at = CURRENT_TIMESTAMP WHERE id = $1 AND read_at IS NULL",
        [notificationId],
      );
    }
    return NextResponse.json({ markedRead: true });
  } catch (error) {
    console.error("Unable to update staff notifications:", error);
    return NextResponse.json(
      { error: "Unable to update staff notifications." },
      { status: 500 },
    );
  }
}
