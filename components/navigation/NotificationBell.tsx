"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type NotificationBellItem = {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  href: string;
  read: boolean;
};

type NotificationBellProps = {
  notifications: NotificationBellItem[];
  unreadCount: number;
  loading?: boolean;
  error?: string;
  viewAllHref: string;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
};

export default function NotificationBell({
  notifications,
  unreadCount,
  loading = false,
  error = "",
  viewAllHref,
  onMarkRead,
  onMarkAllRead,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-controls="header-notifications-menu"
        aria-expanded={isOpen}
        aria-label={`Notifications, ${unreadCount} unread`}
        className="relative flex size-11 items-center justify-center rounded text-surface hover:bg-surface/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        onClick={() => setIsOpen((open) => !open)}
        ref={triggerRef}
        type="button"
      >
        <Bell aria-hidden="true" className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-ink">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <section
          aria-label="Notifications"
          className="absolute right-0 top-full z-[60] mt-2 max-h-[70vh] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-ink/25 border-t-[3px] border-t-gold bg-surface p-3 text-ink shadow-xl"
          id="header-notifications-menu"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Notifications</h2>
            <div className="flex items-center gap-3">
              <button
                className="text-xs font-semibold text-maroon underline disabled:cursor-not-allowed disabled:opacity-50"
                disabled={unreadCount === 0}
                onClick={onMarkAllRead}
                type="button"
              >
                Mark all read
              </button>
              <Link
                className="text-xs font-semibold text-maroon underline"
                href={viewAllHref}
                onClick={() => setIsOpen(false)}
              >
                View all
              </Link>
            </div>
          </div>
          {error && (
            <p className="mb-2 rounded bg-alert px-2 py-1.5 text-xs text-alert-text" role="alert">
              {error}
            </p>
          )}
          {loading ? (
            <p className="rounded bg-page p-3 text-sm text-ink/70" role="status">
              Loading notifications...
            </p>
          ) : notifications.length === 0 && error ? (
            <p className="rounded bg-page p-3 text-sm text-ink/70">
              Resolve the issue above and try again.
            </p>
          ) : notifications.length === 0 ? (
            <p className="rounded bg-page p-3 text-sm text-ink/70">
              No notifications yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {notifications.slice(0, 5).map((notification) => (
                <li key={notification.id}>
                  <Link
                    className={`block rounded-md border border-ink/15 p-3 text-sm hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      notification.read ? "bg-surface" : "bg-accent/10"
                    }`}
                    href={notification.href}
                    onClick={() => {
                      if (!notification.read) onMarkRead(notification.id);
                      setIsOpen(false);
                    }}
                  >
                    <span className="block font-semibold">{notification.title}</span>
                    <span className="mt-1 block">{notification.message}</span>
                    <time
                      className="mt-1 block text-xs text-ink/60"
                      dateTime={notification.createdAt}
                    >
                      {new Date(notification.createdAt).toLocaleString()}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
