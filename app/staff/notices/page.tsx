"use client";

import { useEffect, useState, type FormEvent } from "react";
import StaffShell from "../../../components/StaffShell";
import {
  getOrderedNotices,
  isLabNotice,
  noticeCategories,
  type LabNotice,
  type NoticeCategory,
} from "../../../lib/notices";

type NoticeForm = {
  title: string;
  category: NoticeCategory;
  body: string;
  pinned: boolean;
};

const emptyForm: NoticeForm = {
  title: "",
  category: "Announcements",
  body: "",
  pinned: false,
};

function getErrorMessage(value: unknown, fallback: string) {
  return value &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}

function formatNoticeDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function StaffNoticesPage() {
  const [notices, setNotices] = useState<LabNotice[]>([]);
  const [form, setForm] = useState<NoticeForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
          throw new Error(getErrorMessage(result, "Unable to load lab notices."));
        }
        if (!Array.isArray(result) || !result.every(isLabNotice)) {
          throw new Error("Lab notices were returned in an unexpected format.");
        }
        setNotices(getOrderedNotices(result));
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error("Unable to load staff lab notices:", loadError);
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

  function startEditing(notice: LabNotice) {
    setEditingId(notice.id);
    setForm({
      title: notice.title,
      category: notice.category,
      body: notice.body,
      pinned: notice.pinned,
    });
    setError("");
    setMessage("");
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
  }

  async function saveNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/notices", {
        method: editingId === null ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ...(editingId === null ? {} : { id: editingId }),
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(result, "Unable to save the lab notice."));
      }
      if (!isLabNotice(result)) {
        throw new Error("The saved notice was returned in an unexpected format.");
      }

      setNotices((current) =>
        getOrderedNotices([
          result,
          ...current.filter((notice) => notice.id !== result.id),
        ]),
      );
      setMessage(editingId === null ? "Notice published for students." : "Notice updated.");
      setEditingId(null);
      setForm(emptyForm);
    } catch (saveError) {
      console.error("Unable to save lab notice:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the lab notice.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteNotice(noticeId: number) {
    if (!window.confirm("Delete this notice? Students will no longer see it.")) {
      return;
    }
    setDeletingId(noticeId);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/notices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: noticeId }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(result, "Unable to delete the lab notice."));
      }
      setNotices((current) => current.filter((notice) => notice.id !== noticeId));
      if (editingId === noticeId) cancelEditing();
      setMessage("Notice deleted.");
    } catch (deleteError) {
      console.error("Unable to delete lab notice:", deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete the lab notice.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <StaffShell>
      <h1 className="mb-1 text-xl font-semibold text-ink">Lab notices</h1>
      <p className="mb-4 text-sm text-ink">
        Publish announcements for students. Published notices appear on the student notice board.
      </p>

      {error && (
        <p className="mb-3 rounded bg-alert px-3 py-2 text-sm text-alert-text" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="mb-3 rounded bg-success px-3 py-2 text-sm text-surface" role="status">
          {message}
        </p>
      )}

      <form
        className="mb-6 space-y-3 rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-4"
        onSubmit={(event) => void saveNotice(event)}
      >
        <h2 className="font-semibold text-ink">
          {editingId === null ? "Create a notice" : "Edit notice"}
        </h2>
        <label className="block text-sm font-semibold text-ink" htmlFor="notice-title">
          Title
          <input
            className="mt-1 min-h-10 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            id="notice-title"
            maxLength={120}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            required
            value={form.title}
          />
        </label>

        <label className="block text-sm font-semibold text-ink" htmlFor="notice-category">
          Category
          <select
            className="mt-1 min-h-10 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            id="notice-category"
            onChange={(event) => {
              const category = noticeCategories.find(
                (option) => option === event.target.value,
              );
              if (category) {
                setForm((current) => ({ ...current, category }));
              }
            }}
            value={form.category}
          >
            {noticeCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-ink" htmlFor="notice-body">
          Notice
          <textarea
            className="mt-1 min-h-36 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            id="notice-body"
            maxLength={5000}
            onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            placeholder="Write the announcement students should see..."
            required
            value={form.body}
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            checked={form.pinned}
            onChange={(event) => setForm((current) => ({ ...current, pinned: event.target.checked }))}
            type="checkbox"
          />
          Pin this notice to the top of the student notice board
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            className="min-h-10 rounded-md bg-maroon px-4 py-2 text-sm font-semibold text-surface hover:bg-charcoal disabled:cursor-wait disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? "Saving..." : editingId === null ? "Publish notice" : "Save changes"}
          </button>
          {editingId !== null && (
            <button
              className="min-h-10 rounded-md border border-ink/40 bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-page"
              onClick={cancelEditing}
              type="button"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <section
        aria-label="Published lab notices"
        className="rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-4"
      >
        <h2 className="mb-3 font-semibold text-ink">Published notices</h2>
        {loading ? (
          <p className="text-sm text-ink" role="status">Loading notices...</p>
        ) : notices.length === 0 ? (
          <p className="rounded-md border border-ink/20 bg-page p-3 text-sm text-ink">
            No notices have been published yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {notices.map((notice) => (
              <li className="rounded-md border border-ink/20 p-3" key={notice.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink">{notice.title}</h3>
                      <span className="rounded bg-alert px-2 py-1 text-xs font-semibold text-alert-text">
                        {notice.category}
                      </span>
                      {notice.pinned && (
                        <span className="rounded bg-success px-2 py-1 text-xs font-semibold text-surface">
                          Pinned
                        </span>
                      )}
                    </div>
                    <time className="text-xs text-ink/70" dateTime={notice.created_at}>
                      Published {formatNoticeDate(notice.created_at)}
                    </time>
                    <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-ink">
                      {notice.body}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      className="rounded border border-ink/40 px-3 py-1.5 text-sm font-semibold text-link hover:bg-page"
                      onClick={() => startEditing(notice)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="rounded border border-alert-text px-3 py-1.5 text-sm font-semibold text-alert-text hover:bg-alert disabled:opacity-60"
                      disabled={deletingId === notice.id}
                      onClick={() => void deleteNotice(notice.id)}
                      type="button"
                    >
                      {deletingId === notice.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </StaffShell>
  );
}
