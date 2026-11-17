"use client";

import {
  ChartNoAxesColumnIncreasing,
  Bell,
  ClipboardList,
  LogOut,
  Menu,
  Megaphone,
  Package,
  CalendarDays,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell, {
  type NotificationBellItem,
} from "@/components/navigation/NotificationBell";
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
  {
    label: "Lab Notices",
    href: "/staff/notices",
    Icon: Megaphone,
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
  const [notificationError, setNotificationError] = useState("");
  const [notificationsLoading, setNotificationsLoading] = useState(true);
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
      } finally {
        if (active) setNotificationsLoading(false);
      }
    }

    void loadNotifications();
    const refresh = () => void loadNotifications();
    const interval = window.setInterval(refresh, 15_000);
    window.addEventListener("staff-notifications-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("staff-notifications-updated", refresh);
      window.removeEventListener("focus", refresh);
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
      setUnreadCount((count) =>
        Math.max(
          0,
          count -
            (notifications.some(
              (item) => item.id === notificationId && item.read_at === null,
            )
              ? 1
              : 0),
        ),
      );
      window.dispatchEvent(new Event("staff-notifications-updated"));
    } catch (readError) {
      console.error("Unable to mark staff notification as read:", readError);
      setNotificationError(
        readError instanceof Error
          ? readError.message
          : "Unable to mark the notification as read.",
      );
    }
  }

  async function markAllNotificationsRead() {
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          result &&
            typeof result === "object" &&
            "error" in result &&
            typeof result.error === "string"
            ? result.error
            : "Unable to mark notifications as read.",
        );
      }
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, read_at: item.read_at ?? readAt })),
      );
      setUnreadCount(0);
      setNotificationError("");
      window.dispatchEvent(new Event("staff-notifications-updated"));
    } catch (readError) {
      console.error("Unable to mark staff notifications as read:", readError);
      setNotificationError(
        readError instanceof Error
          ? readError.message
          : "Unable to mark notifications as read.",
      );
    }
  }

  function logOut() {
    localStorage.removeItem("staff");
    router.push("/");
  }

  const bellNotifications: NotificationBellItem[] = notifications.map(
    (notification) => ({
      id: notification.id,
      title: `${notification.event_type} · ${notification.student_name} (${notification.student_id})`,
      message: notification.message,
      createdAt: notification.created_at,
      href:
        notification.event_type === "Borrow"
          ? "/staff/returns"
          : "/staff/reservations",
      read: notification.read_at !== null,
    }),
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="relative z-50 flex h-14 items-center justify-between bg-maroon px-4 text-surface sm:px-6">
        <div className="flex items-center gap-3">
          <button
            aria-expanded={isSidebarOpen}
            aria-label={isSidebarOpen ? "Close staff sidebar" : "Open staff sidebar"}
            className="flex size-11 items-center justify-center rounded hover:bg-surface/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
          <NotificationBell
            error={notificationError}
            loading={notificationsLoading}
            notifications={bellNotifications}
            onMarkAllRead={() => void markAllNotificationsRead()}
            onMarkRead={(id) => void markNotificationRead(id)}
            unreadCount={unreadCount}
            viewAllHref="/staff/notifications"
          />
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
