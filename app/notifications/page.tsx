"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/navigation/TopBar";
import type { StudentNotification } from "@/types/notification";

function isStudentNotification(value: unknown): value is StudentNotification {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "event_type" in value &&
    typeof value.event_type === "string" &&
    "message" in value &&
    typeof value.message === "string" &&
    "href" in value &&
    (typeof value.href === "string" || value.href === null) &&
    "created_at" in value &&
    typeof value.created_at === "string" &&
    "read_at" in value &&
    (typeof value.read_at === "string" || value.read_at === null)
  );
}

function getErrorMessage(value: unknown, fallback: string) {
  return value &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}

export default function StudentNotificationsPage() {
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const savedStudent = localStorage.getItem("student");
        if (!savedStudent) {
          setError("Sign in to view your notifications.");
          setLoading(false);
          return;
        }
        const parsed: unknown = JSON.parse(savedStudent);
        if (
          !parsed ||
          typeof parsed !== "object" ||
          !("student_id" in parsed) ||
          typeof parsed.student_id !== "string" ||
          !parsed.student_id.trim()
        ) {
          setError("Your student profile is unavailable.");
          setLoading(false);
          return;
        }
        setStudentId(parsed.student_id.trim());
        if ("full_name" in parsed && typeof parsed.full_name === "string") {
          setStudentName(parsed.full_name);
        }
      } catch (profileError) {
        console.error("Unable to read student notifications profile.", profileError);
        setError("Unable to read your student profile.");
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!studentId) return;
    const controller = new AbortController();

    async function loadNotifications() {
      try {
        const response = await fetch(
          `/api/students/${encodeURIComponent(studentId)}/notifications`,
          { cache: "no-store", signal: controller.signal },
        );
        const result: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getErrorMessage(result, "Unable to load your notifications."),
          );
        }
        if (
          !result ||
          typeof result !== "object" ||
          !("notifications" in result) ||
          !Array.isArray(result.notifications) ||
          !result.notifications.every(isStudentNotification) ||
          !("unreadCount" in result) ||
          typeof result.unreadCount !== "number"
        ) {
          throw new Error("Your notifications were returned in an unexpected format.");
        }
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
        setError("");
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error("Unable to load student notifications:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your notifications.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadNotifications();
    const refresh = () => {
      if (document.visibilityState === "visible") void loadNotifications();
    };
    const interval = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("student-notifications-updated", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("student-notifications-updated", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [studentId]);

  async function markAsRead(notificationId?: number) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/students/${encodeURIComponent(studentId)}/notifications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            notificationId === undefined ? {} : { id: notificationId },
          ),
        },
      );
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "Unable to update your notifications."),
        );
      }
      const readAt = new Date().toISOString();
      if (notificationId === undefined) {
        setNotifications((current) =>
          current.map((notification) => ({
            ...notification,
            read_at: notification.read_at ?? readAt,
          })),
        );
        setUnreadCount(0);
      } else {
        const wasUnread = notifications.some(
          (notification) =>
            notification.id === notificationId && notification.read_at === null,
        );
        setNotifications((current) =>
          current.map((notification) =>
            notification.id === notificationId
              ? { ...notification, read_at: notification.read_at ?? readAt }
              : notification,
          ),
        );
        if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1));
      }
      window.dispatchEvent(new Event("student-notifications-updated"));
    } catch (updateError) {
      console.error("Unable to update student notifications:", updateError);
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update your notifications.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <TopBar studentName={studentName || undefined} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">Notifications</h1>
            <p className="mt-1 text-sm text-ink/70">
              {studentId
                ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                : "Sign in to see your notifications."}
            </p>
          </div>
          <button
            className="min-h-11 rounded bg-maroon px-4 text-sm font-semibold text-surface hover:bg-charcoal disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            disabled={saving || unreadCount === 0}
            onClick={() => void markAsRead()}
            type="button"
          >
            {saving ? "Saving..." : "Mark all as read"}
          </button>
        </div>
        {error && (
          <p className="mb-3 rounded bg-alert px-3 py-2 text-sm text-alert-text" role="alert">
            {error}
          </p>
        )}
        <section
          aria-label="Student notifications"
          className="rounded-lg border border-ink/25 border-t-[3px] border-t-gold bg-surface p-4"
        >
          {loading ? (
            <p className="py-6 text-center text-sm text-ink/70" role="status">
              Loading notifications...
            </p>
          ) : notifications.length === 0 && error ? (
            <p className="rounded bg-page p-4 text-sm text-ink/70">
              Resolve the issue above and try again.
            </p>
          ) : notifications.length === 0 ? (
            <p className="rounded bg-page p-4 text-sm text-ink/70">
              No notifications yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {notifications.map((notification) => (
                <li
                  className={`rounded-md border border-ink/15 p-4 ${
                    notification.read_at ? "bg-surface" : "bg-accent/10"
                  }`}
                  key={notification.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold text-ink">
                      {notification.event_type}
                    </h2>
                    {!notification.read_at && (
                      <span className="rounded-full bg-accent px-2 py-1 text-xs font-semibold text-ink">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink">{notification.message}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-ink/70">
                    <time dateTime={notification.created_at}>
                      {new Date(notification.created_at).toLocaleString()}
                    </time>
                    <div className="flex items-center gap-3">
                      {notification.href && (
                        <Link
                          className="font-semibold text-link hover:underline"
                          href={notification.href}
                        >
                          View details
                        </Link>
                      )}
                      {!notification.read_at && (
                        <button
                          className="font-semibold text-maroon underline disabled:opacity-60"
                          disabled={saving}
                          onClick={() => void markAsRead(notification.id)}
                          type="button"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
