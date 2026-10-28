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

  useEffect(() => {
    // Read the student record saved in localStorage during login
    const savedStudent = localStorage.getItem("student");
    if (savedStudent) {
      try {
        const parsed = JSON.parse(savedStudent);
        if (parsed.full_name) {
          setStudentName(parsed.full_name);
        }
      } catch (e) {
        console.error("Failed to parse student data", e);
      }
    }
  }, []);

  return (
    <>
      <TopBar studentName={studentName} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
        <h1 className="mb-4 text-xl font-semibold text-ink">
          Good morning, {studentName}
        </h1>

        <div
          className="mb-4 flex items-center gap-4 rounded bg-alert px-4 py-3 text-alert-text"
          role="status"
        >
          <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
          <div>
            <p className="font-semibold">2 items are overdue</p>
            <p className="text-sm">
              Return the oscilloscope and multimeter by 5:00 PM today to avoid late fees.
            </p>
          </div>
        </div>

        <section
          aria-label="Dashboard information"
          className="mb-4 grid gap-4 md:grid-cols-3"
        >
          {mockHomeCards.map((card) => (
            <article
              className="rounded-md border border-ink/30 border-t-2 border-t-gold bg-surface p-3"
              id={card.title === "Lab notices" ? "lab-notices" : undefined}
              key={card.title}
            >
              <h2 className="mb-2 font-semibold text-ink">{card.title}</h2>
              <p className="mb-2 text-sm text-ink">{card.description}</p>
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
              className="flex aspect-square flex-col items-start gap-2 rounded-md border border-ink/30 border-t-2 border-t-gold bg-surface p-3 text-ink transition-colors hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
          <article className="flex aspect-square flex-col items-start gap-2 rounded-md border border-ink/30 border-t-2 border-t-gold bg-surface p-3 text-ink">
            <span className="flex size-8 items-center justify-center rounded border border-ink/40">
              <CircleHelp aria-hidden="true" className="size-5" />
            </span>
            <h2 className="font-semibold">Help</h2>
            <p className="text-sm text-ink">
              Open support, guides and lab rules.
            </p>
          </article>
        </nav>
      </main>
    </>
  );
}