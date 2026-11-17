import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { StudentNotification } from "@/types/notification";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const studentId = id.trim();
  if (!studentId || studentId.length > 20) {
    return NextResponse.json({ error: "Invalid student ID." }, { status: 400 });
  }

  try {
    const studentResult = await pool.query(
      "SELECT student_id FROM students WHERE student_id = $1",
      [studentId],
    );
    if (studentResult.rowCount === 0) {
      return NextResponse.json({ error: "Student was not found." }, { status: 404 });
    }

    const notificationsResult = await pool.query<StudentNotification>(
      `SELECT id, event_type, message, href, created_at, read_at
       FROM student_notifications
       WHERE student_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 50`,
      [studentId],
    );
    const unreadResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::integer AS count
       FROM student_notifications
       WHERE student_id = $1 AND read_at IS NULL`,
      [studentId],
    );

    return NextResponse.json(
      {
        notifications: notificationsResult.rows,
        unreadCount: unreadResult.rows[0].count,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Unable to load student notifications:", error);
    return NextResponse.json(
      { error: "Unable to load student notifications." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const studentId = id.trim();
  if (!studentId || studentId.length > 20) {
    return NextResponse.json({ error: "Invalid student ID." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid notification update." },
      { status: 400 },
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { error: "Invalid notification update." },
      { status: 400 },
    );
  }
  const notificationId = "id" in body ? body.id : undefined;
  if (
    notificationId !== undefined &&
    (typeof notificationId !== "number" ||
      !Number.isInteger(notificationId) ||
      notificationId < 1)
  ) {
    return NextResponse.json({ error: "Invalid notification ID." }, { status: 400 });
  }

  try {
    const studentResult = await pool.query(
      "SELECT student_id FROM students WHERE student_id = $1",
      [studentId],
    );
    if (studentResult.rowCount === 0) {
      return NextResponse.json({ error: "Student was not found." }, { status: 404 });
    }

    if (notificationId === undefined) {
      await pool.query(
        `UPDATE student_notifications
         SET read_at = CURRENT_TIMESTAMP
         WHERE student_id = $1 AND read_at IS NULL`,
        [studentId],
      );
    } else {
      await pool.query(
        `UPDATE student_notifications
         SET read_at = CURRENT_TIMESTAMP
         WHERE student_id = $1 AND id = $2 AND read_at IS NULL`,
        [studentId, notificationId],
      );
    }
    return NextResponse.json({ markedRead: true });
  } catch (error) {
    console.error("Unable to update student notifications:", error);
    return NextResponse.json(
      { error: "Unable to update student notifications." },
      { status: 500 },
    );
  }
}
