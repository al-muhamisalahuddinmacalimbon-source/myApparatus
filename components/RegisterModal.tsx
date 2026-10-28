"use client";

import { FormEvent, useState } from "react";
import { Student } from "../lib/mockStudent";

type RegisterModalProps = {
  initialStudentId: string;
  onSave: (student: Student) => Promise<void>;
  onCancel: () => void;
};

type RegistrationFields = {
  studentId: string;
  name: string;
  course: string;
  yearLevel: string;
};

export default function RegisterModal({
  initialStudentId,
  onSave,
  onCancel,
}: RegisterModalProps) {
  const [fields, setFields] = useState<RegistrationFields>({
    studentId: initialStudentId,
    name: "",
    course: "",
    yearLevel: "",
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fields.studentId.trim() || !fields.name.trim() || !fields.course.trim() || !fields.yearLevel) {
      setError("Please complete all registration fields.");
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      await onSave({
        studentId: fields.studentId.trim(),
        name: fields.name.trim(),
        course: fields.course.trim(),
        yearLevel: fields.yearLevel,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to register your account.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function updateField(field: keyof RegistrationFields, value: string) {
    setFields((currentFields) => ({ ...currentFields, [field]: value }));
    setError("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4">
      <section
        aria-labelledby="registration-title"
        aria-modal="true"
        className="w-full max-w-md rounded-md border border-ink/20 border-t-2 border-t-gold bg-surface p-6 shadow-lg"
        role="dialog"
      >
        <h2 className="mb-4 text-xl font-semibold text-ink" id="registration-title">
          Register new student
        </h2>
        <p
          className={`mb-4 text-sm ${error ? "text-alert-text" : "text-ink/70"}`}
          role={error ? "alert" : "status"}
        >
          {error || "Validation errors will appear here"}
        </p>

        <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-ink" htmlFor="registration-student-id">
              Student ID
            </label>
            <input
              autoFocus
              autoComplete="off"
              className="h-10 rounded border border-ink/40 bg-surface px-3 text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              id="registration-student-id"
              onChange={(event) => updateField("studentId", event.target.value)}
              placeholder="e.g. 2024-0053"
              required
              value={fields.studentId}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-ink" htmlFor="registration-name">
              Full name
            </label>
            <input
              className="h-10 rounded border border-ink/40 bg-surface px-3 text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              id="registration-name"
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Enter full name"
              required
              value={fields.name}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-ink" htmlFor="registration-course">
              Course
            </label>
            <input
              className="h-10 rounded border border-ink/40 bg-surface px-3 text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              id="registration-course"
              onChange={(event) => updateField("course", event.target.value)}
              placeholder="Select course"
              required
              value={fields.course}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-ink" htmlFor="registration-year-level">
              Year Level
            </label>
            <select
              className="h-10 rounded border border-ink/40 bg-surface px-3 text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              id="registration-year-level"
              onChange={(event) => updateField("yearLevel", event.target.value)}
              required
              value={fields.yearLevel}
            >
              <option value="">Select year level</option>
              {["1st", "2nd", "3rd", "4th", "5th", "6th"].map((year, index) => (
                <option key={year} value={index + 1}>
                  {year} Year
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-3">
            <button
              className="rounded border border-ink/40 px-4 py-2 font-semibold text-ink hover:bg-page focus:outline-2 focus:outline-offset-2 focus:outline-accent"
              onClick={onCancel}
              disabled={isSaving}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded bg-maroon px-4 py-2 font-semibold text-surface hover:bg-charcoal focus:outline-2 focus:outline-offset-2 focus:outline-accent disabled:opacity-50"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
