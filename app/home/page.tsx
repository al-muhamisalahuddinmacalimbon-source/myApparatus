"use client";

import { useState, useEffect } from "react";
import {
  CalendarDays,
  CircleAlert,
  CircleHelp,
  PackagePlus,
} from "lucide-react";
import Link from "next/link";
import TopBar from "../../components/TopBar";
import { mockHomeCards } from "../../lib/mockHome";
import { mockNotices } from "../../lib/mockNotices";

type DashboardItem = {
  name: string;
  quantity: number;
};

type OverdueLoan = {
  loan_id: number;
  due_at: string;
  item_count: number;
  items: DashboardItem[];
};

type DueSoonLoan = OverdueLoan;

type UpcomingReservation = {
  id: number;
  machine_name: string;
  start_time: string;
  end_time: string;
};

type DashboardActivity = {
  overdueLoans: OverdueLoan[];
  dueSoonLoans: DueSoonLoan[];
  upcomingReservations: UpcomingReservation[];
};

function isDashboardItem(value: unknown): value is DashboardItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "quantity" in value &&
    typeof value.quantity === "number"
  );
}

function isOverdueLoan(value: unknown): value is OverdueLoan {
  return (
    typeof value === "object" &&
    value !== null &&
    "loan_id" in value &&
    typeof value.loan_id === "number" &&
    "due_at" in value &&
    typeof value.due_at === "string" &&
    "item_count" in value &&
    typeof value.item_count === "number" &&
    "items" in value &&
    Array.isArray(value.items) &&
    value.items.every(isDashboardItem)
  );
}

function isUpcomingReservation(value: unknown): value is UpcomingReservation {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "machine_name" in value &&
    typeof value.machine_name === "string" &&
    "start_time" in value &&
    typeof value.start_time === "string" &&
    "end_time" in value &&
    typeof value.end_time === "string"
  );
}

function isDashboardActivity(value: unknown): value is DashboardActivity {
  return (
    typeof value === "object" &&
    value !== null &&
    "overdueLoans" in value &&
    Array.isArray(value.overdueLoans) &&
    value.overdueLoans.every(isOverdueLoan) &&
    "dueSoonLoans" in value &&
    Array.isArray(value.dueSoonLoans) &&
    value.dueSoonLoans.every(isOverdueLoan) &&
    "upcomingReservations" in value &&
    Array.isArray(value.upcomingReservations) &&
    value.upcomingReservations.every(isUpcomingReservation)
  );
}

function formatReservationDateTime(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
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
  return Math.max(1, Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000));
}

const dashboardTiles = [
  {
    title: "Borrow",
    description: "Find and check out equipment.",
    href: "/catalog",
    Icon: PackagePlus,
  },
  {
    title: "Reserve",
    description: "Book a machine for a future session.",
    href: "/reserve",
    Icon: CalendarDays,
  },
];

export default function HomePage() {
  const [studentName, setStudentName] = useState<string>("Student");
  const [activity, setActivity] = useState<DashboardActivity | null>(null);
  const [activityError, setActivityError] = useState("");

  useEffect(() => {
    let controller: AbortController | null = null;
    const timeout = window.setTimeout(() => {
      const savedStudent = localStorage.getItem("student");
      if (!savedStudent) {
        setActivityError("Student information is unavailable. Please sign in again.");
        return;
      }

      let studentId: string;
      try {
        const parsed: unknown = JSON.parse(savedStudent);
        if (
          !parsed ||
          typeof parsed !== "object" ||
          !("student_id" in parsed) ||
          typeof parsed.student_id !== "string" ||
          !parsed.student_id.trim()
        ) {
          throw new Error("Saved student information is invalid. Please sign in again.");
        }
        studentId = parsed.student_id;
        if ("full_name" in parsed && typeof parsed.full_name === "string") {
          setStudentName(parsed.full_name);
        }
      } catch (error) {
        console.error("Unable to read the saved student profile.", error);
        setActivityError(
          error instanceof Error
            ? error.message
            : "Unable to read the saved student profile.",
        );
        return;
      }

      controller = new AbortController();
      async function loadActivity() {
        try {
          const response = await fetch(
            `/api/students/${encodeURIComponent(studentId)}/dashboard`,
            { cache: "no-store", signal: controller?.signal },
          );
          const result: unknown = await response.json();
          if (!response.ok) {
            const message =
              result &&
              typeof result === "object" &&
              "error" in result &&
              typeof result.error === "string"
                ? result.error
                : "Unable to load your borrowing and reservation activity.";
            throw new Error(message);
          }
          if (!isDashboardActivity(result)) {
            throw new Error("The dashboard API returned data in an unexpected format.");
          }
          setActivity(result);
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          console.error("Unable to load student dashboard activity.", error);
          setActivityError(
            error instanceof Error
              ? error.message
              : "Unable to load your borrowing and reservation activity.",
          );
        }
      }

      void loadActivity();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
      controller?.abort();
    };
  }, []);

  const overdueCount =
    activity?.overdueLoans.reduce((total, loan) => total + loan.item_count, 0) ?? 0;
  const dueSoonLoans = activity?.dueSoonLoans ?? [];
  const overdueItemNames = [
    ...new Set(
      activity?.overdueLoans.flatMap((loan) =>
        loan.items.map((item) => item.name),
      ) ?? [],
    ),
  ];
  const dueSoonCount =
    dueSoonLoans.reduce((total, loan) => total + loan.item_count, 0);
  const hasDeadlineNotice = overdueCount > 0 || dueSoonCount > 0;

  return (
    <>
      <TopBar studentName={studentName} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
        <h1 className="mb-4 text-xl font-semibold text-ink">
          Good morning, {studentName}
        </h1>

        {activityError ? (
          <div
            className="mb-4 flex items-center gap-4 rounded bg-alert px-4 py-3 text-alert-text"
            role="alert"
          >
            <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
            <p className="text-sm">{activityError}</p>
          </div>
        ) : activity ? (
          <div
            className={`mb-4 flex items-start gap-4 rounded px-4 py-3 ${
              hasDeadlineNotice
                ? "bg-alert text-alert-text"
                : "bg-success text-surface"
            }`}
            role="status"
          >
            {hasDeadlineNotice ? (
              <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            ) : (
              <CalendarDays aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            )}
            <div className="space-y-2">
              {overdueCount > 0 ? (
                <div>
                  <p className="font-semibold">
                    {overdueCount} {overdueCount === 1 ? "item is" : "items are"} overdue
                  </p>
                  <p className="text-sm">
                    Return: {overdueItemNames.join(", ")}.
                  </p>
                </div>
              ) : null}
              {dueSoonLoans.length > 0 && (
                <div>
                  <p className="font-semibold">
                    {dueSoonCount} {dueSoonCount === 1 ? "item is" : "items are"} due soon
                  </p>
                  <ul className="text-sm">
                    {dueSoonLoans.map((loan) => {
                      const daysUntilDue = getDaysUntilDue(loan.due_at);
                      const itemNames = loan.items
                        .map((item) =>
                          item.quantity > 1
                            ? `${item.name} × ${item.quantity}`
                            : item.name,
                        )
                        .join(", ");

                      return (
                        <li key={loan.loan_id}>
                          {itemNames} — due {formatDueDate(loan.due_at)} (in{" "}
                          {daysUntilDue} {daysUntilDue === 1 ? "day" : "days"})
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {overdueCount === 0 && dueSoonCount === 0 && (
                <p className="font-semibold">You have no overdue or soon-due items.</p>
              )}
              {activity.upcomingReservations.length > 0 && (
                <div>
                  <p className="font-semibold">Upcoming machine reservations</p>
                  <ul className="text-sm">
                    {activity.upcomingReservations.map((reservation) => (
                      <li key={reservation.id}>
                        {reservation.machine_name} ·{" "}
                        {formatReservationDateTime(reservation.start_time)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p
            className="mb-4 rounded border border-ink/20 bg-surface px-4 py-3 text-sm text-ink"
            role="status"
          >
            Loading your borrowing and reservation activity...
          </p>
        )}

        <section
          aria-label="Dashboard information"
          className="mb-4 grid gap-4 md:grid-cols-3"
        >
          {mockHomeCards.map((card) => (
            <article
              className="rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-3"
              id={card.title === "Lab notices" ? "lab-notices" : undefined}
              key={card.title}
            >
              <h2 className="mb-2 font-semibold text-ink">{card.title}</h2>
              {card.title === "Lab notices" && (
                <p className="mb-2 text-sm text-ink">
                  {mockNotices.length} notices available.
                </p>
              )}
              {card.title !== "Lab notices" && (
                  <p className="mb-2 text-sm text-ink">{card.description}</p>
              )}
              <Link
                className="inline-flex rounded bg-maroon px-3 py-1.5 text-sm text-surface hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                href={card.href}
              >
                {card.actionLabel}
              </Link>
            </article>
          ))}
        </section>

        <nav
          aria-label="Student tools"
          className="mx-auto grid max-w-[39rem] gap-4 sm:grid-cols-3"
        >
          {dashboardTiles.map(({ title, description, href, Icon }) => (
            <Link
              className="flex aspect-square flex-col items-start gap-2 rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-3 text-ink transition-colors hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              href={href}
              key={title}
            >
              <span className="flex size-8 items-center justify-center rounded border border-ink/40">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="font-semibold">{title}</span>
              <span className="text-sm text-ink">{description}</span>
            </Link>
          ))}
          <Link
            className="flex aspect-square flex-col items-start gap-2 rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-3 text-ink transition-colors hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            href="/help"
          >
            <span className="flex size-8 items-center justify-center rounded border border-ink/40">
              <CircleHelp aria-hidden="true" className="size-5" />
            </span>
            <span className="font-semibold">Help</span>
            <p className="text-sm text-ink">
              Open support, guides and lab rules.
            </p>
          </Link>
        </nav>
      </main>
    </>
  );
}