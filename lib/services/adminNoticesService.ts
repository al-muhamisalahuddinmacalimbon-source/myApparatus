import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import pool from "@/lib/db";
import { addStudentNotification } from "@/lib/services/studentNotificationWriter";
import { noticeCategories } from "@/types/notice";
import type { NoticeCategory } from "@/types/notice";

type NoticeInput = {
  title: string;
  category: NoticeCategory;
  body: string;
  pinned: boolean;
};

function isNoticeInput(value: unknown): value is NoticeInput {
  return (
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    value.title.trim().length <= 120 &&
    "category" in value &&
    typeof value.category === "string" &&
    noticeCategories.some((category) => category === value.category) &&
    "body" in value &&
    typeof value.body === "string" &&
    value.body.trim().length > 0 &&
    value.body.trim().length <= 5000 &&
    "pinned" in value &&
    typeof value.pinned === "boolean"
  );
}

function getNoticeId(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    !("id" in value) ||
    typeof value.id !== "number" ||
    !Number.isInteger(value.id) ||
    value.id < 1
  ) {
    return null;
  }
  return value.id;
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body: unknown = await readJson(request);
  if (!isNoticeInput(body)) {
    return NextResponse.json(
      { error: "Enter a title, category, notice, and valid pin setting." },
      { status: 400 },
    );
  }

  let client: PoolClient | undefined;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;
    const result = await client.query(
      `INSERT INTO lab_notices (title, category, body, pinned)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, category, body, pinned, created_at`,
      [body.title.trim(), body.category, body.body.trim(), body.pinned],
    );
    const studentsResult = await client.query<{ student_id: string }>(
      "SELECT student_id FROM students",
    );
    for (const student of studentsResult.rows) {
      await addStudentNotification(client, {
        studentId: student.student_id,
        eventType: "Lab Notice",
        message: `New lab notice: ${body.title.trim()}`,
        href: `/notices/${result.rows[0].id}`,
      });
    }
    await client.query("COMMIT");
    transactionStarted = false;
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Lab Notice Creation Rollback Error:", rollbackError);
      }
    }
    console.error("Unable to publish lab notice:", error);
    return NextResponse.json(
      { error: "Unable to publish the lab notice." },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}

export async function PUT(request: Request) {
  const body: unknown = await readJson(request);
  const noticeId = getNoticeId(body);
  if (noticeId === null || !isNoticeInput(body)) {
    return NextResponse.json(
      { error: "Enter a valid notice ID, title, category, notice, and pin setting." },
      { status: 400 },
    );
  }

  try {
    const result = await pool.query(
      `UPDATE lab_notices
       SET title = $1, category = $2, body = $3, pinned = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, title, category, body, pinned, created_at`,
      [body.title.trim(), body.category, body.body.trim(), body.pinned, noticeId],
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Notice not found." }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Unable to update lab notice:", error);
    return NextResponse.json(
      { error: "Unable to update the lab notice." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const body: unknown = await readJson(request);
  const noticeId = getNoticeId(body);
  if (noticeId === null) {
    return NextResponse.json({ error: "Enter a valid notice ID." }, { status: 400 });
  }

  try {
    const result = await pool.query(
      "DELETE FROM lab_notices WHERE id = $1 RETURNING id",
      [noticeId],
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Notice not found." }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Unable to delete lab notice:", error);
    return NextResponse.json(
      { error: "Unable to delete the lab notice." },
      { status: 500 },
    );
  }
}
