"use client";

import {
  ChartNoAxesColumnIncreasing,
  Bell,
  ClipboardList,
  LogOut,
  Menu,
  Package,
  CalendarDays,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type StaffShellProps = {
  children: ReactNode;
};

type StaffNotification = {
  id: number;
  event_type: string;
  student_name: string;
  student_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

const navigationItems = [
  {
    label: "Active Loans",
    href: "/staff/dashboard",
    Icon: ClipboardList,
    available: true,
  },
  {
    label: "Returns",
    href: "/staff/returns",
    Icon: RotateCcw,
    available: true,
  },
  {
    label: "Reservations",
    href: "/staff/reservations",
    Icon: CalendarDays,
    available: true,
  },
  {
    label: "Notifications",
    href: "/staff/notifications",
    Icon: Bell,
    available: true,
  },
  {
    label: "Catalog",
    href: "/staff/catalog",
    Icon: Package,
    available: true,
  },
  {
    label: "Reports",
    href: "/staff/reports",
    Icon: ChartNoAxesColumnIncreasing,
    available: true,
  },
];

function getStoredStaffName() {
  const storedStaff = localStorage.getItem("staff");
  if (!storedStaff) return "Staff";

  try {
    const parsed: unknown = JSON.parse(storedStaff);
    if (
      parsed &&
      typeof parsed === "object" &&
      "name" in parsed &&
      typeof parsed.name === "string"
    ) {
      return parsed.name;
    }
  } catch {
    return "Staff";
  }

  return "Staff";
}

function subscribeToStaffChanges(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export default function StaffShell({ children }: StaffShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const staffName = useSyncExternalStore(
    subscribeToStaffChanges,
    getStoredStaffName,
    () => "Staff",
  );

  useEffect(() => {
    let active = true;
    async function loadNotifications() {
      try {
        const response = await fetch("/api/admin/notifications", {
          cache: "no-store",
        });
        const result: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            result &&
              typeof result === "object" &&
              "error" in result &&
              typeof result.error === "string"
              ? result.error
              : "Unable to load staff notifications.",
          );
        }
        if (
          !result ||
          typeof result !== "object" ||
          !("notifications" in result) ||
          !Array.isArray(result.notifications) ||
          !("unreadCount" in result) ||
          typeof result.unreadCount !== "number"
        ) {
          throw new Error("Staff notifications were returned in an unexpected format.");
        }
        const validNotifications = result.notifications.filter(
          (item): item is StaffNotification =>
            typeof item === "object" &&
            item !== null &&
            "id" in item &&
            typeof item.id === "number" &&
            "event_type" in item &&
            typeof item.event_type === "string" &&
            "student_name" in item &&
            typeof item.student_name === "string" &&
            "student_id" in item &&
            typeof item.student_id === "string" &&
            "message" in item &&
            typeof item.message === "string" &&
            "created_at" in item &&
            typeof item.created_at === "string" &&
            "read_at" in item &&
            (typeof item.read_at === "string" || item.read_at === null),
        );
        if (validNotifications.length !== result.notifications.length) {
          throw new Error("Staff notifications contain invalid records.");
        }
        if (active) {
          setNotifications(validNotifications);
          setUnreadCount(result.unreadCount);
          setNotificationError("");
        }
      } catch (loadError) {
        if (!active) return;
        console.error("Unable to load staff notifications:", loadError);
        setNotificationError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load staff notifications.",
        );
      }
    }

    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 15_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  async function markNotificationRead(notificationId: number) {
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId }),
      });
      if (!response.ok) throw new Error("Unable to mark the notification as read.");
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId
            ? { ...item, read_at: new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (readError) {
      console.error("Unable to mark staff notification as read:", readError);
      setNotificationError(
        readError instanceof Error
          ? readError.message
          : "Unable to mark the notification as read.",
      );
    }
  }

  function logOut() {
    localStorage.removeItem("staff");
    router.push("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between bg-maroon px-4 text-surface sm:px-6">
        <div className="flex items-center gap-3">
          <button
            aria-expanded={isSidebarOpen}
            aria-label={isSidebarOpen ? "Close staff sidebar" : "Open staff sidebar"}
            className="flex size-8 items-center justify-center rounded hover:bg-surface/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={() => setIsSidebarOpen((open) => !open)}
            type="button"
          >
            {isSidebarOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
          <Link className="font-bold" href="/staff/dashboard">
            myApparatus
          </Link>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="relative">
            <button
              aria-expanded={isNotificationsOpen}
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
              className="relative flex size-9 items-center justify-center rounded hover:bg-surface/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={() => setIsNotificationsOpen((open) => !open)}
              type="button"
            >
              <Bell aria-hidden="true" className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-alert px-1 text-center text-xs font-bold text-alert-text">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            {isNotificationsOpen && (
              <div className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-3 text-ink shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-semibold">Notifications</h2>
                  <Link
                    className="text-sm text-link hover:underline"
                    href="/staff/notifications"
                    onClick={() => setIsNotificationsOpen(false)}
                  >
                    View all
                  </Link>
                </div>
                {notificationError ? (
                  <p className="rounded bg-alert p-2 text-sm text-alert-text">
                    {notificationError}
                  </p>
                ) : notifications.length === 0 ? (
                  <p className="p-2 text-sm">No notifications.</p>
                ) : (
                  <ul className="max-h-80 space-y-1 overflow-y-auto">
                    {notifications.slice(0, 5).map((notification) => (
                      <li key={notification.id}>
                        <Link
                          className={`block rounded p-2 text-sm hover:bg-page ${
                            notification.read_at ? "" : "bg-page font-semibold"
                          }`}
                          href={
                            notification.event_type === "Cancellation Request"
                              ? "/staff/reservations"
                              : notification.event_type === "Reservation"
                                ? "/staff/reservations"
                                : "/staff/dashboard"
                          }
                          onClick={() => {
                            if (!notification.read_at) {
                              void markNotificationRead(notification.id);
                            }
                            setIsNotificationsOpen(false);
                          }}
                        >
                          <span className="block text-xs text-ink/70">
                            {notification.event_type} · {notification.student_name} (
                            {notification.student_id})
                          </span>
                          {notification.message}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <span>{staffName}</span>
          <button
            className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            onClick={logOut}
            type="button"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {isSidebarOpen && (
        <aside className="w-60 shrink-0 bg-charcoal p-3 text-surface">
          <nav aria-label="Staff navigation" className="flex flex-col gap-2">
            {navigationItems.map(({ label, href, Icon, available }) =>
              available ? (
                <Link
                  aria-current={pathname === href ? "page" : undefined}
                  className={
                    pathname === href
                      ? "flex min-h-11 items-center gap-3 rounded border border-accent bg-maroon px-3 text-sm font-semibold text-surface"
                      : "flex min-h-11 items-center gap-3 rounded border border-surface/40 px-3 text-sm text-surface hover:bg-surface/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  }
                  href={href}
                  key={label}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded border border-surface/30 bg-surface/10">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  {label}
                  {label === "Notifications" && unreadCount > 0 && (
                    <span className="ml-auto rounded-full bg-alert px-2 py-0.5 text-xs font-bold text-alert-text">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              ) : (
                <div
                  aria-disabled="true"
                  className="flex min-h-11 items-center gap-3 rounded border border-surface/20 px-3 text-sm text-surface/60"
                  key={label}
                  title="Not available yet"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded border border-surface/20">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  {label}
                </div>
              ),
            )}
            <button
              className="mt-2 flex min-h-11 items-center gap-3 rounded border border-surface/40 px-3 text-left text-sm text-surface hover:bg-surface/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={logOut}
              type="button"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded border border-surface/30">
                <LogOut aria-hidden="true" className="size-5" />
              </span>
              Logout
            </button>
          </nav>
        </aside>
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
