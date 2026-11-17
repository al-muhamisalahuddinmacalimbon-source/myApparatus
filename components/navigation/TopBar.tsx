"use client";

import { useEffect, useState } from "react";
import { Menu, Search, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationBell, {
  type NotificationBellItem,
} from "@/components/navigation/NotificationBell";
import type {
  StudentNotification,
  StudentNotificationEvent,
} from "@/types/notification";

type TopBarProps = {
  studentName?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  cartCount?: number;
  onCartClick?: () => void;
};

const notificationEvents: StudentNotificationEvent[] = [
  "Reservation",
  "Reservation Update",
  "Cancellation Request",
  "Borrow",
  "Return",
  "Lab Notice",
];

function isStudentNotification(value: unknown): value is StudentNotification {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "event_type" in value &&
    typeof value.event_type === "string" &&
    notificationEvents.some((event) => event === value.event_type) &&
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

export default function TopBar({
  studentName,
  searchValue,
  onSearchChange,
  cartCount = 0,
  onCartClick,
}: TopBarProps) {
  const pathname = usePathname();
  const [isStudentMenuOpen, setIsStudentMenuOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsError, setNotificationsError] = useState("");
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const savedStudent = localStorage.getItem("student");
        if (!savedStudent) {
          setNotificationsError("Sign in to view your notifications.");
          setNotificationsLoading(false);
          return;
        }
        const parsed: unknown = JSON.parse(savedStudent);
        if (
          parsed &&
          typeof parsed === "object" &&
          "student_id" in parsed &&
          typeof parsed.student_id === "string" &&
          parsed.student_id.trim().length > 0
        ) {
          setStudentId(parsed.student_id.trim());
        } else {
          setNotificationsError("Your student profile is unavailable.");
          setNotificationsLoading(false);
        }
      } catch (error) {
        console.error("Unable to read student notifications profile.", error);
        setNotificationsError("Unable to read your student profile.");
        setNotificationsLoading(false);
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
        setNotificationsError("");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Unable to load student notifications:", error);
        setNotificationsError(
          error instanceof Error ? error.message : "Unable to load your notifications.",
        );
      } finally {
        if (!controller.signal.aborted) setNotificationsLoading(false);
      }
    }

    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 15_000);
    const refresh = () => {
      if (document.visibilityState === "visible") void loadNotifications();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("student-notifications-updated", refresh);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("student-notifications-updated", refresh);
    };
  }, [studentId]);

  function closeStudentMenu() {
    setIsStudentMenuOpen(false);
  }

  function logOut() {
    localStorage.removeItem("student");
  }

  async function markNotificationAsRead(notificationId: number) {
    try {
      const response = await fetch(
        `/api/students/${encodeURIComponent(studentId)}/notifications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notificationId }),
        },
      );
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "Unable to mark the notification as read."),
        );
      }
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read_at: notification.read_at ?? new Date().toISOString() }
            : notification,
        ),
      );
      setUnreadCount((current) =>
        Math.max(
          0,
          current -
            (notifications.some(
              (notification) =>
                notification.id === notificationId && notification.read_at === null,
            )
              ? 1
              : 0),
        ),
      );
      window.dispatchEvent(new Event("student-notifications-updated"));
    } catch (error) {
      console.error("Unable to mark student notification as read:", error);
      setNotificationsError(
        error instanceof Error
          ? error.message
          : "Unable to mark the notification as read.",
      );
    }
  }

  async function markAllNotificationsAsRead() {
    try {
      const response = await fetch(
        `/api/students/${encodeURIComponent(studentId)}/notifications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "Unable to mark notifications as read."),
        );
      }
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read_at: notification.read_at ?? readAt,
        })),
      );
      setUnreadCount(0);
      setNotificationsError("");
      window.dispatchEvent(new Event("student-notifications-updated"));
    } catch (error) {
      console.error("Unable to mark student notifications as read:", error);
      setNotificationsError(
        error instanceof Error
          ? error.message
          : "Unable to mark notifications as read.",
      );
    }
  }

  const bellNotifications: NotificationBellItem[] = notifications.map(
    (notification) => ({
      id: notification.id,
      title: notification.event_type,
      message: notification.message,
      createdAt: notification.created_at,
      href: notification.href ?? "/home",
      read: notification.read_at !== null,
    }),
  );
  const notificationBell = (
    <NotificationBell
      error={notificationsError}
      loading={notificationsLoading}
      notifications={bellNotifications}
      onMarkAllRead={() => void markAllNotificationsAsRead()}
      onMarkRead={(id) => void markNotificationAsRead(id)}
      unreadCount={unreadCount}
      viewAllHref="/notifications"
    />
  );

  return (
    <>
      <header className="relative z-50 flex h-14 items-center justify-between gap-4 bg-maroon px-4 text-surface sm:px-6">
        <div className="flex items-center gap-4">
          <button
            aria-expanded={isStudentMenuOpen}
            aria-label={isStudentMenuOpen ? "Close student menu" : "Open student menu"}
            className="flex size-11 items-center justify-center rounded hover:bg-surface/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={() => setIsStudentMenuOpen((isOpen) => !isOpen)}
            type="button"
          >
            {isStudentMenuOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
          <Link className="font-bold" href="/home">
            myApparatus
          </Link>
        </div>
        {onSearchChange ? (
          <div className="flex min-w-0 items-center gap-3">
            <label className="flex h-9 min-w-0 items-center gap-2 rounded border border-ink/30 bg-surface px-3 text-ink sm:w-68">
              <Search aria-hidden="true" className="size-4 shrink-0" />
              <span className="sr-only">Search equipment</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/60"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search equipment"
                type="search"
                value={searchValue ?? ""}
              />
            </label>
            <button
              aria-label={`Cart, ${cartCount} items`}
              className="flex h-9 items-center gap-2 rounded border border-ink/30 bg-surface px-3 text-sm text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={onCartClick}
              type="button"
            >
              <ShoppingCart aria-hidden="true" className="size-4" />
              <span>Cart</span>
              <span className="rounded border border-ink/30 px-1.5 py-0.5 text-xs">
                {cartCount}
              </span>
            </button>
            {notificationBell}
          </div>
        ) : (
          <div className="flex items-center gap-6 text-sm">
            {notificationBell}
            {studentName && (
              <Link
                aria-label={`${studentName}, go to home`}
                className="text-surface hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                href="/home"
              >
                {studentName}
              </Link>
            )}
            <Link
              className="text-surface hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              href="/"
              onClick={logOut}
            >
              Logout
            </Link>
          </div>
        )}
      </header>
      {isStudentMenuOpen && (
        <div className="fixed inset-0 top-14 z-40 flex">
          <button
            aria-label="Close student menu"
            className="absolute inset-0 bg-charcoal/40"
            onClick={closeStudentMenu}
            type="button"
          />
          <nav
            aria-label="Student navigation"
            className="relative flex h-full w-60 max-w-[85vw] flex-col gap-2 border-r border-surface/15 bg-charcoal p-3 text-surface shadow-xl"
          >
            {[
              { label: "Home", href: "/home" },
              { label: "My Bookings", href: "/my-bookings" },
              { label: "Notifications", href: "/notifications" },
              { label: "Catalog", href: "/catalog" },
              { label: "Shared Machines", href: "/reserve" },
              { label: "Lab Notices", href: "/notices" },
              { label: "Help", href: "/help" },
            ].map((item) => (
              <Link
                aria-current={pathname === item.href ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  pathname === item.href
                    ? "border-accent bg-maroon font-semibold"
                    : "border-surface/40 hover:bg-surface/10"
                }`}
                href={item.href}
                key={item.href}
                onClick={closeStudentMenu}
              >
                {item.label}
                {item.label === "Notifications" && unreadCount > 0 && (
                  <span className="ml-auto rounded-full bg-alert px-2 py-0.5 text-xs font-bold text-alert-text">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            ))}
            <Link
              className="mt-4 flex min-h-10 items-center rounded border border-surface/50 px-3 text-sm hover:bg-surface/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              href="/"
              onClick={() => {
                closeStudentMenu();
                logOut();
              }}
            >
              Logout
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
