"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import StaffShell from "../../../components/StaffShell";
import type { StaffLoan, StaffLoanItem } from "../../../lib/mockLoans";

type StatusFilter = "All" | "Overdue Only";

function isStaffLoanItem(value: unknown): value is StaffLoanItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "quantity" in value &&
    typeof value.quantity === "number"
  );
}

function isStaffLoan(value: unknown): value is StaffLoan {
  return (
    typeof value === "object" &&
    value !== null &&
    "loanId" in value &&
    typeof value.loanId === "number" &&
    "studentId" in value &&
    typeof value.studentId === "string" &&
    "studentName" in value &&
    typeof value.studentName === "string" &&
    "items" in value &&
    Array.isArray(value.items) &&
    value.items.every(isStaffLoanItem) &&
    "borrowedAt" in value &&
    typeof value.borrowedAt === "string" &&
    "dueAt" in value &&
    typeof value.dueAt === "string" &&
    "status" in value &&
    (value.status === "Active" || value.status === "Overdue")
  );
}

function getErrorMessage(value: unknown, fallback: string) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }
  return fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function StaffDashboardPage() {
  const [loans, setLoans] = useState<StaffLoan[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [returningLoanId, setReturningLoanId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLoans() {
      try {
        const response = await fetch("/api/admin/active-loans", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();

        if (!response.ok) {
          throw new Error(getErrorMessage(payload, "Unable to load active loans."));
        }
        if (!Array.isArray(payload) || !payload.every(isStaffLoan)) {
          throw new Error("The active loans response was invalid.");
        }

        setLoans(payload);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error("Unable to load active loans:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load active loans.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadLoans();
    return () => controller.abort();
  }, []);

  const filteredLoans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return loans.filter((loan) => {
      const matchesSearch =
        !query ||
        loan.studentId.toLowerCase().includes(query) ||
        loan.studentName.toLowerCase().includes(query) ||
        loan.items.some((item) => item.name.toLowerCase().includes(query));
      const matchesStatus =
        statusFilter === "All" || loan.status === "Overdue";
      return matchesSearch && matchesStatus;
    });
  }, [loans, search, statusFilter]);

  async function confirmReturn(loanId: number) {
    setReturningLoanId(loanId);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/active-loans/${loanId}/return`,
        { method: "POST" },
      );
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Unable to confirm this return."));
      }

      setLoans((currentLoans) =>
        currentLoans.filter((loan) => loan.loanId !== loanId),
      );
    } catch (returnError) {
      console.error("Unable to confirm equipment return:", returnError);
      setError(
        returnError instanceof Error
          ? returnError.message
          : "Unable to confirm this return.",
      );
    } finally {
      setReturningLoanId(null);
    }
  }

  return (
    <StaffShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink">Active Loans</h1>
        <div className="flex flex-wrap gap-2">
          <label className="flex h-10 items-center gap-2 rounded border border-ink/40 bg-surface px-3 text-ink">
            <Search aria-hidden="true" className="size-4 text-ink/60" />
            <span className="sr-only">Search student or item</span>
            <input
              className="w-48 bg-transparent text-sm outline-none placeholder:text-ink/60"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student or item"
              type="search"
              value={search}
            />
          </label>
          <label className="sr-only" htmlFor="loan-status">
            Filter loan status
          </label>
          <select
            className="h-10 rounded border border-ink/40 bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            id="loan-status"
            onChange={(event) => {
              setStatusFilter(
                event.target.value === "Overdue Only" ? "Overdue Only" : "All",
              );
            }}
            value={statusFilter}
          >
            <option>All</option>
            <option>Overdue Only</option>
          </select>
        </div>
      </div>

      {error && (
        <p
          className="mb-4 rounded border border-ink/20 bg-alert px-4 py-3 text-sm text-alert-text"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-ink/40 border-t-[3px] border-t-accent bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left text-sm text-ink">
            <thead className="bg-page">
              <tr className="border-b border-ink/20">
                <th className="px-3 py-3 font-semibold" scope="col">
                  Student
                </th>
                <th className="px-3 py-3 font-semibold" scope="col">
                  Apparatus
                </th>
                <th className="px-3 py-3 font-semibold" scope="col">
                  Checkout date and time
                </th>
                <th className="px-3 py-3 font-semibold" scope="col">
                  Due date
                </th>
                <th className="px-3 py-3 font-semibold" scope="col">
                  Status
                </th>
                <th className="px-3 py-3 font-semibold" scope="col">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-6 text-center" colSpan={6}>
                    Loading active loans...
                  </td>
                </tr>
              ) : filteredLoans.length > 0 ? (
                filteredLoans.map((loan) => {
                  const isOverdue = loan.status === "Overdue";
                  return (
                    <tr
                      className={
                        isOverdue
                          ? "border-b border-ink/15 bg-alert/40 text-alert-text"
                          : "border-b border-ink/15 last:border-0"
                      }
                      key={loan.loanId}
                    >
                      <td className="px-3 py-3">
                        <div className="font-semibold">{loan.studentName}</div>
                        <div className="text-xs opacity-80">{loan.studentId}</div>
                      </td>
                      <td className="px-3 py-3">
                        {loan.items
                          .map((item) => `${item.name} x${item.quantity}`)
                          .join(", ")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {formatDateTime(loan.borrowedAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {formatDate(loan.dueAt)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={
                            isOverdue
                              ? "rounded bg-alert px-2 py-1 text-xs font-semibold text-alert-text"
                              : "rounded bg-success px-2 py-1 text-xs font-semibold text-surface"
                          }
                        >
                          {isOverdue ? "Overdue" : "Active"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          className="min-h-9 rounded bg-maroon px-3 text-sm font-semibold text-surface hover:bg-charcoal disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          disabled={returningLoanId === loan.loanId}
                          onClick={() => void confirmReturn(loan.loanId)}
                          type="button"
                        >
                          {returningLoanId === loan.loanId
                            ? "Processing..."
                            : "Confirm Return"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center" colSpan={6}>
                    No active loans match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </StaffShell>
  );
}
