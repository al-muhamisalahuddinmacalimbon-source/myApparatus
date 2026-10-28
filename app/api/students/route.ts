import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid registration details." },
        { status: 400 },
      );
    }

    const studentId = "student_id" in body ? body.student_id : undefined;
    const fullName = "full_name" in body ? body.full_name : undefined;
    const course = "course" in body ? body.course : undefined;
    const yearLevel = "year_level" in body ? body.year_level : undefined;

    if (
      typeof studentId !== "string" ||
      typeof fullName !== "string" ||
      typeof course !== "string" ||
      typeof yearLevel !== "number" ||
      !Number.isInteger(yearLevel) ||
      yearLevel < 1 ||
      yearLevel > 6 ||
      studentId.trim().length === 0 ||
      studentId.trim().length > 20 ||
      fullName.trim().length === 0 ||
      fullName.trim().length > 100 ||
      course.trim().length === 0 ||
      course.trim().length > 100
    ) {
      return NextResponse.json(
        { error: "Please enter valid registration details." },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `INSERT INTO students (student_id, full_name, course, year_level)
       VALUES ($1, $2, $3, $4)
       RETURNING student_id, full_name, course, year_level`,
      [studentId.trim(), fullName.trim(), course.trim(), yearLevel],
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { error: "That Student ID is already registered." },
        { status: 409 },
      );
    }

    console.error("Student Registration Error:", error);
    return NextResponse.json(
      { error: "Unable to register your account. Please try again." },
      { status: 500 },
    );
  }
}
