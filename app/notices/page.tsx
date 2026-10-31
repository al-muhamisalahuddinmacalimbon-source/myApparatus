"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import TopBar from "../../components/TopBar";
import {
  getOrderedNotices,
  mockNotices,
} from "../../lib/mockNotices";

const categories = ["All", "Schedule", "Safety", "Announcements"] as const;
type CategoryFilter = (typeof categories)[number];

function formatNoticeDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function categoryBadgeClass() {
  return "rounded bg-alert px-2 py-1 text-xs font-semibold text-alert-text";
}

export default function NoticesPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("All");

  const notices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return getOrderedNotices(mockNotices).filter((notice) => {
      const matchesTitle = notice.title.toLowerCase().includes(query);
      const matchesCategory =
        selectedCategory === "All" || notice.category === selectedCategory;
      return matchesTitle && matchesCategory;
    });
  }, [search, selectedCategory]);

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <h1 className="mb-4 text-xl font-semibold text-ink">Lab Notices</h1>

        <label className="mb-3 flex h-10 items-center gap-2 rounded-md border border-ink/40 bg-surface px-3 text-ink">
          <Search aria-hidden="true" className="size-4 shrink-0 text-ink/60" />
          <span className="sr-only">Search notices</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/50"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notices"
            type="search"
            value={search}
          />
        </label>

        <div
          aria-label="Filter notices by category"
          className="mb-4 flex flex-wrap gap-2"
          role="group"
        >
          {categories.map((category) => (
            <button
              aria-pressed={selectedCategory === category}
              className={
                selectedCategory === category
                  ? "rounded-md bg-maroon px-3 py-1.5 text-sm font-semibold text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  : "rounded-md border border-ink/40 bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              }
              key={category}
              onClick={() => setSelectedCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>

        {notices.length > 0 ? (
          <section
            aria-label="Notices"
            className="grid gap-3 md:grid-cols-2"
          >
            {notices.map((notice) => (
              <article
                className="rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-3"
                key={notice.id}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {notice.pinned && (
                      <span className="rounded bg-success px-2 py-1 text-xs font-semibold text-surface">
                        Pinned
                      </span>
                    )}
                    <span className={categoryBadgeClass()}>
                      {notice.category}
                    </span>
                  </div>
                  <time className="shrink-0 text-xs font-semibold text-ink">
                    {formatNoticeDate(notice.date)}
                  </time>
                </div>
                <h2 className="mb-2 font-semibold text-ink">{notice.title}</h2>
                <p className="mb-2 line-clamp-2 text-sm text-ink">
                  {notice.body[0]}
                </p>
                <Link
                  className="text-sm font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  href={`/notices/${notice.id}`}
                >
                  Read notice
                </Link>
              </article>
            ))}
          </section>
        ) : (
          <p className="rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-4 text-sm text-ink">
            No notices match your search.
          </p>
        )}
      </main>
    </>
  );
}
