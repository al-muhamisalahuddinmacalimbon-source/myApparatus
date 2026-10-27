"use client";

import { FormEvent, useState } from "react";
import { Student } from "../lib/mockStudent";

type RegisterModalProps = {
  studentId: string;
  onSave: (student: Student) => void;
  onCancel: () => void;
};

type RegistrationFields = {
  name: string;
  course: string;
  yearLevel: string;
};

type RegistrationErrors = Partial<Record<keyof RegistrationFields, string>>;

export default function RegisterModal({
  studentId,
  onSave,
  onCancel,
}: RegisterModalProps) {
  const [fields, setFields] = useState<RegistrationFields>({
    name: "",
    course: "",
    yearLevel: "",
  });
  const [errors, setErrors] = useState<RegistrationErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: RegistrationErrors = {};

    if (!fields.name.trim()) {
      nextErrors.name = "Name is required.";
    }
    if (!fields.course.trim()) {
      nextErrors.course = "Course is required.";
    }
    if (!fields.yearLevel.trim()) {
      nextErrors.yearLevel = "Year Level is required.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onSave({
      studentId,
      name: fields.name.trim(),
      course: fields.course.trim(),
      yearLevel: fields.yearLevel.trim(),
    });
  }

  function updateField(field: keyof RegistrationFields, value: string) {
    setFields((currentFields) => ({ ...currentFields, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4">
      <section
        aria-labelledby="registration-title"
        aria-modal="true"
        className="w-full max-w-md rounded-md border border-ink/20 border-t-2 border-t-gold bg-surface p-6 shadow-lg"
        role="dialog"
      >
        <h2 className="mb-3 text-xl font-semibold text-ink" id="registration-title">
          Register for an account
        </h2>
        <p className="mb-4 rounded bg-alert px-3 py-2 text-sm text-alert-text">
          Student ID Not Found
        </p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-ink" htmlFor="registration-student-id">
              Student ID
            </label>
            <input
              className="h-10 rounded border border-ink bg-page px-3 text-ink"
              id="registration-student-id"
              readOnly
              value={studentId}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-ink" htmlFor="registration-name">
              Name
            </label>
            <input
              autoFocus
              className="h-10 rounded border border-ink bg-surface px-3 text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              id="registration-name"
              onChange={(event) => updateField("name", event.target.value)}
              required
              value={fields.name}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "registration-name-error" : undefined}
            />
            {errors.name && (
              <p className="text-sm text-alert-text" id="registration-name-error">
                {errors.name}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-ink" htmlFor="registration-course">
              Course
            </label>
            <input
              className="h-10 rounded border border-ink bg-surface px-3 text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              id="registration-course"
              onChange={(event) => updateField("course", event.target.value)}
              required
              value={fields.course}
              aria-invalid={Boolean(errors.course)}
              aria-describedby={errors.course ? "registration-course-error" : undefined}
            />
            {errors.course && (
              <p className="text-sm text-alert-text" id="registration-course-error">
                {errors.course}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-ink" htmlFor="registration-year-level">
              Year Level
            </label>
            <input
              className="h-10 rounded border border-ink bg-surface px-3 text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              id="registration-year-level"
              onChange={(event) => updateField("yearLevel", event.target.value)}
              required
              value={fields.yearLevel}
              aria-invalid={Boolean(errors.yearLevel)}
              aria-describedby={errors.yearLevel ? "registration-year-level-error" : undefined}
            />
            {errors.yearLevel && (
              <p className="text-sm text-alert-text" id="registration-year-level-error">
                {errors.yearLevel}
              </p>
            )}
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button
              className="rounded border border-accent px-4 py-2 font-semibold text-link hover:bg-page focus:outline-2 focus:outline-offset-2 focus:outline-accent"
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded bg-maroon px-4 py-2 font-semibold text-surface hover:bg-charcoal focus:outline-2 focus:outline-offset-2 focus:outline-accent"
              type="submit"
            >
              Save
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
