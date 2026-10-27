"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import RegisterModal from "../components/RegisterModal";
import { useStudents } from "../components/StudentProvider";
import type { Student } from "../lib/mockStudent";

export default function Home() {
  const router = useRouter();
  const { students, addStudent } = useStudents();
  const inputRef = useRef<HTMLInputElement>(null);
  const registrationOpenRef = useRef(false);
  const [studentId, setStudentId] = useState("");
  const [showRegistration, setShowRegistration] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const enteredId = studentId.trim();
    const studentExists = students.some(
      (student) => student.studentId === enteredId,
    );

    if (studentExists) {
      router.push("/home");
      return;
    }

    setError("Student ID Not Found");
    registrationOpenRef.current = true;
    setShowRegistration(true);
  }

  function handleRegistrationSave(student: Student) {
    addStudent(student);
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
              Go
            </button>
          </form>
        </section>
      </main>

      {showRegistration && (
        <RegisterModal
          onCancel={handleRegistrationCancel}
          onSave={handleRegistrationSave}
          studentId={studentId.trim()}
        />
      )}
    </>
  );
}
