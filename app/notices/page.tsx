"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TopBar from "../../components/TopBar";
import {
  getOrderedNotices,
  isLabNotice,
  noticeCategories,
  type LabNotice,
} from "../../lib/notices";

const categories = ["All", ...noticeCategories] as const;
type CategoryFilter = (typeof categories)[number];

function formatNoticeDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function categoryBadgeClass() {
  return "rounded bg-alert px-2 py-1 text-xs font-semibold text-alert-text";
}

export default function NoticesPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("All");
  const [notices, setNotices] = useState<LabNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadNotices() {
      try {
        const response = await fetch("/api/notices", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            result &&
              typeof result === "object" &&
              "error" in result &&
              typeof result.error === "string"
              ? result.error
              : "Unable to load lab notices.",
          );
        }
        if (!Array.isArray(result) || !result.every(isLabNotice)) {
          throw new Error("Lab notices were returned in an unexpected format.");
        }
        setNotices(result);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error("Unable to load lab notices:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load lab notices.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadNotices();
    return () => controller.abort();
  }, []);

  const filteredNotices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return getOrderedNotices(notices).filter((notice) => {
      const matchesSearch =
        notice.title.toLowerCase().includes(query) ||
        notice.body.toLowerCase().includes(query);
      const matchesCategory =
        selectedCategory === "All" || notice.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [notices, search, selectedCategory]);

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

        {error ? (
          <p className="rounded-lg bg-alert p-4 text-sm text-alert-text" role="alert">
            {error}
          </p>
        ) : loading ? (
          <p className="rounded-lg border border-ink/30 bg-surface p-4 text-sm text-ink" role="status">
            Loading lab notices...
          </p>
        ) : filteredNotices.length > 0 ? (
          <section aria-label="Notices" className="grid gap-3 md:grid-cols-2">
            {filteredNotices.map((notice) => (
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
                  <time className="shrink-0 text-xs font-semibold text-ink" dateTime={notice.created_at}>
                    {formatNoticeDate(notice.created_at)}
                  </time>
                </div>
                <h2 className="mb-2 font-semibold text-ink">{notice.title}</h2>
                <p className="mb-2 line-clamp-2 whitespace-pre-line text-sm text-ink">
                  {notice.body}
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
            {notices.length === 0
              ? "There are no lab notices yet."
              : "No notices match your search."}
          </p>
        )}
      </main>
    </>
  );
}
