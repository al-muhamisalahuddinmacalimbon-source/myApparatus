"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StaffShell from "../../../components/StaffShell";

type StaffNotification = {
  id: number;
  event_type: string;
  student_name: string;
  student_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

function isStaffNotification(value: unknown): value is StaffNotification {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "event_type" in value &&
    typeof value.event_type === "string" &&
    "student_name" in value &&
    typeof value.student_name === "string" &&
    "student_id" in value &&
    typeof value.student_id === "string" &&
    "message" in value &&
    typeof value.message === "string" &&
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

export default function StaffNotificationsPage() {
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadNotifications() {
      try {
        const response = await fetch("/api/admin/notifications", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result: unknown = await response.json();
        if (!response.ok) {
          throw new Error(getErrorMessage(result, "Unable to load notifications."));
        }
        if (
          !result ||
          typeof result !== "object" ||
          !("notifications" in result) ||
          !Array.isArray(result.notifications) ||
          !result.notifications.every(isStaffNotification)
        ) {
          throw new Error("Notifications were returned in an unexpected format.");
        }
        setNotifications(result.notifications);
        setError("");
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error("Unable to load staff notifications:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load notifications.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadNotifications();
    return () => controller.abort();
  }, []);

  async function markAllAsRead() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(result, "Unable to mark notifications as read."));
      }
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, read_at: item.read_at ?? readAt })),
      );
      setNotice("All notifications marked as read.");
    } catch (markError) {
      console.error("Unable to mark notifications as read:", markError);
      setError(
        markError instanceof Error
          ? markError.message
          : "Unable to mark notifications as read.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <StaffShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink">Notifications</h1>
        <button
          className="rounded-md bg-maroon px-3 py-2 text-sm font-semibold text-surface hover:bg-charcoal disabled:opacity-60"
          disabled={
            saving || notifications.every((notification) => notification.read_at)
          }
          onClick={() => void markAllAsRead()}
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
      {notice && (
        <p className="mb-3 rounded bg-success px-3 py-2 text-sm text-surface" role="status">
          {notice}
        </p>
      )}
      <section
        aria-label="Staff notifications"
        className="rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-4"
      >
        {loading ? (
          <p className="text-sm text-ink" role="status">
            Loading notifications...
          </p>
        ) : notifications.length === 0 ? (
          <p className="rounded-md border border-ink/20 bg-page p-3 text-sm text-ink">
            No notifications.
          </p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((notification) => (
              <li
                className={`rounded-md border border-ink/20 p-3 ${
                  notification.read_at ? "bg-surface" : "bg-page"
                }`}
                key={notification.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">
                    {notification.event_type} · {notification.student_name} (
                    {notification.student_id})
                  </p>
                  {!notification.read_at && (
                    <span className="rounded-full bg-alert px-2 py-1 text-xs font-semibold text-alert-text">
                      New
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink">{notification.message}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink/70">
                  <time dateTime={notification.created_at}>
                    {new Date(notification.created_at).toLocaleString()}
                  </time>
                  <Link
                    className="font-semibold text-link hover:underline"
                    href={
                      notification.event_type === "Borrow"
                        ? "/staff/returns"
                        : "/staff/reservations"
                    }
                  >
                    {notification.event_type === "Borrow"
                      ? "View borrowing history"
                      : "View reservations"}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </StaffShell>
  );
}
