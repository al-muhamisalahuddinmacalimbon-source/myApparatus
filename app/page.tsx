"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import RegisterModal from "../components/RegisterModal";
import type { Student } from "../lib/mockStudent";

export default function Home() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const registrationOpenRef = useRef(false);
  const [studentId, setStudentId] = useState("");
  const [showRegistration, setShowRegistration] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const enteredId = studentId.trim();
  if (!enteredId) return;

  setError("");

  try {
    // 1. Query PostgreSQL API for the entered Student ID
    const res = await fetch(`/api/students/${enteredId}`);

    if (res.ok) {
      const studentData = await res.json();
      
      // 2. Save student profile to localStorage so Home & Catalog screens can use it
      localStorage.setItem("student", JSON.stringify(studentData));
      
      // 3. Navigate to Student Home (S2)
      router.push("/home");
    } else {
      setError("Student ID Not Found in Database");
    }
  } catch (err) {
    console.error("Error connecting to the student API:", err);
    setError("Error connecting to server");
  }
}

  async function handleRegistrationSave(student: Student) {
    const response = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: student.studentId,
        full_name: student.name,
        course: student.course,
        year_level: Number.parseInt(student.yearLevel, 10),
      }),
    });
    const data: unknown = await response.json();

    if (!response.ok) {
      const message =
        data &&
        typeof data === "object" &&
        "error" in data &&
        typeof data.error === "string"
          ? data.error
          : "Unable to register your account.";
      throw new Error(message);
    }

    localStorage.setItem("student", JSON.stringify(data));
    registrationOpenRef.current = false;
    router.push("/home");
  }

  function handleRegistrationCancel() {
    registrationOpenRef.current = false;
    setShowRegistration(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleInputBlur() {
    if (registrationOpenRef.current) {
      return;
    }

    window.setTimeout(() => {
      if (!registrationOpenRef.current) {
        inputRef.current?.focus();
      }
    }, 0);
  }

  return (
    <>
      <header className="flex h-11 items-center justify-between bg-maroon px-6 text-surface">
        <span className="font-bold">myApparatus</span>
        <Link className="text-sm text-surface hover:underline" href="/staff/login">
          Staff login
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <section className="w-full max-w-sm rounded-md border border-ink/20 border-t-2 border-t-gold bg-surface p-6">
          <h1 className="mb-5 text-xl font-semibold text-ink">
            Scan or type your Student ID
          </h1>

          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <label className="text-sm font-semibold text-ink" htmlFor="student-id">
              Student ID
            </label>
            <input
              ref={inputRef}
              autoFocus
              autoComplete="off"
              className="h-11 rounded border border-ink bg-surface px-3 text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              id="student-id"
              onBlur={handleInputBlur}
              onChange={(event) => {
                setStudentId(event.target.value);
                setError("");
              }}
              placeholder="e.g. 2024-0053"
              required
              type="text"
              value={studentId}
            />
            {error && (
              <p className="rounded bg-alert px-3 py-2 text-sm text-alert-text" role="alert">
                {error}
              </p>
            )}
            <button
              className="mt-1 h-11 rounded bg-maroon font-semibold text-surface hover:bg-charcoal focus:outline-2 focus:outline-offset-2 focus:outline-accent"
              type="submit"
            >
              Login
            </button>
          </form>
          <button
            className="mt-4 w-full text-center text-sm font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={() => {
              registrationOpenRef.current = true;
              setShowRegistration(true);
            }}
            type="button"
          >
            Register for an account
          </button>
        </section>
      </main>

      {showRegistration && (
        <RegisterModal
          onCancel={handleRegistrationCancel}
          onSave={handleRegistrationSave}
          initialStudentId={studentId.trim()}
        />
      )}
    </>
  );
}
