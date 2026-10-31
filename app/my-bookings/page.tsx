"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TopBar from "../../components/TopBar";

type DueFilter = "all" | "due-soon" | "overdue";

type BorrowedItem = {
  name: string;
  quantity: number;
};

type BorrowedLoan = {
  loan_id: number;
  borrowed_at: string;
  due_at: string;
  items: BorrowedItem[];
};

function isBorrowedItem(value: unknown): value is BorrowedItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "quantity" in value &&
    typeof value.quantity === "number" &&
    Number.isInteger(value.quantity) &&
    value.quantity > 0
  );
}

function isBorrowedLoan(value: unknown): value is BorrowedLoan {
  return (
    typeof value === "object" &&
    value !== null &&
    "loan_id" in value &&
    typeof value.loan_id === "number" &&
    "borrowed_at" in value &&
    typeof value.borrowed_at === "string" &&
    "due_at" in value &&
    typeof value.due_at === "string" &&
    "items" in value &&
    Array.isArray(value.items) &&
    value.items.length > 0 &&
    value.items.every(isBorrowedItem)
  );
}

function formatBorrowedAt(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatDueDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getDaysUntilDue(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

export default function MyBookingsPage() {
  const [borrowings, setBorrowings] = useState<BorrowedLoan[]>([]);
  const [search, setSearch] = useState("");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentName, setStudentName] = useState<string | undefined>();

  useEffect(() => {
    const controller = new AbortController();

    async function loadBorrowings() {
      try {
        const savedStudent = localStorage.getItem("student");
        if (!savedStudent) {
          throw new Error("Student information is unavailable. Please sign in again.");
        }

        const parsedStudent: unknown = JSON.parse(savedStudent);
        if (
          !parsedStudent ||
          typeof parsedStudent !== "object" ||
          !("student_id" in parsedStudent) ||
          typeof parsedStudent.student_id !== "string" ||
          parsedStudent.student_id.trim().length === 0
        ) {
          throw new Error("Saved student information is invalid. Please sign in again.");
        }
        if ("full_name" in parsedStudent && typeof parsedStudent.full_name === "string") {
          setStudentName(parsedStudent.full_name);
        }

        const response = await fetch(
          `/api/students/${encodeURIComponent(parsedStudent.student_id)}/loans`,
          { signal: controller.signal },
        );
        const result: unknown = await response.json();

        if (!response.ok) {
          const message =
            result &&
            typeof result === "object" &&
            "error" in result &&
            typeof result.error === "string"
              ? result.error
              : "Unable to load your borrowed equipment.";
          throw new Error(message);
        }
        if (!Array.isArray(result) || !result.every(isBorrowedLoan)) {
          throw new Error("The borrowing API returned data in an unexpected format.");
        }

        setBorrowings(result);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        console.error("Unable to load the signed-in student's borrowings.", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your borrowed equipment.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadBorrowings();
    return () => controller.abort();
  }, []);

  const filteredBorrowings = borrowings.filter((borrowing) => {
    const matchesSearch = borrowing.items.some((item) =>
      item.name.toLowerCase().includes(search.trim().toLowerCase()),
    );
    const daysUntilDue = getDaysUntilDue(borrowing.due_at);
    const matchesDueFilter =
      dueFilter === "all" ||
      (dueFilter === "due-soon" && daysUntilDue > 0 && daysUntilDue <= 3) ||
      (dueFilter === "overdue" && daysUntilDue <= 0);

    return matchesSearch && matchesDueFilter;
  });

  return (
    <>
      <TopBar studentName={studentName} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
        <h1 className="mb-1 text-xl font-semibold text-ink">My Bookings</h1>
        <p className="mb-4 text-sm text-ink">
          View the equipment you borrowed and its due date.
        </p>

        <section aria-labelledby="borrowings-heading">
          <h2
            className="mb-2 font-semibold text-ink"
            id="borrowings-heading"
          >
            Active borrowings
          </h2>
          {!loading && !error && borrowings.length > 0 && (
            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Filter by equipment name</span>
                <input
                  className="h-10 w-full rounded-md border border-ink/40 bg-surface px-3 text-sm text-ink outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Filter by equipment name"
                  type="search"
                  value={search}
                />
              </label>
              <label>
                <span className="sr-only">Filter by due date</span>
                <select
                  className="h-10 w-full rounded-md border border-ink/40 bg-surface px-3 text-sm text-ink outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent sm:w-auto"
                  onChange={(event) =>
                    setDueFilter(event.target.value as DueFilter)
                  }
                  value={dueFilter}
                >
                  <option value="all">All borrowings</option>
                  <option value="due-soon">Due within 3 days</option>
                  <option value="overdue">Overdue</option>
                </select>
              </label>
            </div>
          )}
          <div className="space-y-3">
            {loading ? (
              <p className="rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-3 text-sm text-ink">
                Loading your borrowed equipment...
              </p>
            ) : error ? (
              <p
                className="rounded bg-alert px-3 py-2 text-sm text-alert-text"
                role="alert"
              >
                {error}
              </p>
            ) : borrowings.length > 0 && filteredBorrowings.length > 0 ? (
              filteredBorrowings.map((borrowing) => {
                const daysUntilDue = getDaysUntilDue(borrowing.due_at);
                const daysOverdue = Math.max(1, Math.abs(daysUntilDue));

                return (
                  <article
                    className="rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-3"
                    key={borrowing.loan_id}
                  >
                    <h3 className="mb-2 font-semibold text-ink">
                      Borrowed items
                    </h3>
                    <ul className="mb-3 list-inside list-disc space-y-1 text-sm text-ink">
                      {borrowing.items.map((item) => (
                        <li key={item.name}>
                          {item.name} × {item.quantity}
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-ink">
                      Borrowed: {formatBorrowedAt(borrowing.borrowed_at)}
                    </p>
                    <p className="text-sm text-ink">
                      Due date: {formatDueDate(borrowing.due_at)}
                    </p>
                    <p
                      className={`mt-2 inline-flex rounded px-2 py-1 text-sm font-semibold ${
                        daysUntilDue <= 0
                          ? "bg-alert text-alert-text"
                          : "bg-success text-surface"
                      }`}
                      role="status"
                    >
                      {daysUntilDue <= 0
                        ? `Overdue by ${daysOverdue} ${
                            daysOverdue === 1 ? "day" : "days"
                          }`
                        : daysUntilDue === 1
                          ? "Due in 1 day"
                          : `Due in ${daysUntilDue} days`}
                    </p>
                  </article>
                );
              })
            ) : borrowings.length > 0 ? (
              <p className="rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-3 text-sm text-ink">
                No borrowings match your filters.
              </p>
            ) : (
              <article className="rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-3">
                <p className="font-semibold text-ink">
                  You have no borrowed equipment.
                </p>
                <p className="mt-2 text-sm text-ink">
                  Items you borrow from the catalog will appear here.
                </p>
              </article>
            )}
          </div>
        </section>

        <Link
          className="mt-4 inline-flex rounded-md border border-ink/40 bg-surface px-3 py-1.5 text-sm font-semibold text-link hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          href="/catalog"
        >
          Back to catalog
        </Link>
      </main>
    </>
  );
}
