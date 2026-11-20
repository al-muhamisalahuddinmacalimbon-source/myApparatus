"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import StaffShell from "@/components/navigation/StaffShell";
import Modal from "@/components/ui/Modal";
import BorrowerSlip from "@/components/ui/BorrowerSlip";
import type { StaffLoan, StaffLoanItem } from "@/types/reservation";

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
    (value.status === "Active" || value.status === "Overdue") &&
    "remarks" in value &&
    (typeof value.remarks === "string" || value.remarks === null)
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
  const [savingRemarkId, setSavingRemarkId] = useState<number | null>(null);
  const [remarkEditorLoanId, setRemarkEditorLoanId] = useState<number | null>(null);
  const [remarkDraft, setRemarkDraft] = useState("");
  const [remarkError, setRemarkError] = useState("");
  const [selectedLoan, setSelectedLoan] = useState<StaffLoan | null>(null);

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
        if (!Array.isArray(payload)) {
          throw new Error("The active loans response was invalid.");
        }
        const activeLoans = payload.filter(isStaffLoan);
        if (activeLoans.length !== payload.length) {
          throw new Error("The active loans response was invalid.");
        }

        setLoans(activeLoans);
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
        loan.items.some((item) => item.name.toLowerCase().includes(query)) ||
        loan.remarks?.toLowerCase().includes(query);
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
      setSelectedLoan((currentLoan) =>
        currentLoan?.loanId === loanId ? null : currentLoan,
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

  async function saveRemark() {
    if (remarkEditorLoanId === null) return;

    const loanId = remarkEditorLoanId;
    setSavingRemarkId(loanId);
    setRemarkError("");

    try {
      const response = await fetch(`/api/admin/active-loans/${loanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: remarkDraft }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Unable to save this remark."));
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("loanId" in payload) ||
        payload.loanId !== loanId ||
        !("remarks" in payload) ||
        (typeof payload.remarks !== "string" && payload.remarks !== null)
      ) {
        throw new Error("The loan remarks API returned an invalid response.");
      }

      const savedRemarks = payload.remarks;
      setLoans((currentLoans) =>
        currentLoans.map((loan) =>
          loan.loanId === loanId ? { ...loan, remarks: savedRemarks } : loan,
        ),
      );
      setSelectedLoan((currentLoan) =>
        currentLoan?.loanId === loanId
          ? { ...currentLoan, remarks: savedRemarks }
          : currentLoan,
      );
      setRemarkDraft(savedRemarks ?? "");
      setRemarkEditorLoanId(null);
    } catch (saveError) {
      console.error("Unable to save active loan remark:", saveError);
      setRemarkError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save this remark.",
      );
    } finally {
      setSavingRemarkId(null);
    }
  }

  const remarkEditorLoan = loans.find(
    (loan) => loan.loanId === remarkEditorLoanId,
  );

  return (
    <StaffShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink">Active Loans</h1>
        <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto">
          <label className="flex h-10 w-full min-w-0 items-center gap-2 rounded border border-ink/40 bg-surface px-3 text-ink sm:w-48">
            <Search aria-hidden="true" className="size-4 text-ink/60" />
            <span className="sr-only">Search student or item</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/60"
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
            className="h-10 w-full rounded border border-ink/40 bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
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

      {loading ? (
        <p
          className="rounded-lg border border-ink/20 bg-surface px-4 py-8 text-center text-sm text-ink"
          role="status"
        >
          Loading active loans...
        </p>
      ) : filteredLoans.length > 0 ? (
        <ul aria-label="Active loans" className="space-y-3">
          {filteredLoans.map((loan) => {
            const isOverdue = loan.status === "Overdue";
            return (
              <li key={loan.loanId}>
                <article
                  className={`min-w-0 rounded-lg border border-ink/20 border-l-4 p-4 shadow-sm ${
                    isOverdue
                      ? "border-l-alert bg-alert/10"
                      : "border-l-maroon bg-surface"
                  }`}
                >
                  <header className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-base font-semibold text-ink">
                        {loan.studentName}
                      </h2>
                      <p className="text-sm text-ink/70">{loan.studentId}</p>
                    </div>
                    <span
                      className={
                        isOverdue
                          ? "shrink-0 rounded bg-alert px-2 py-1 text-xs font-semibold text-alert-text"
                          : "shrink-0 rounded bg-success px-2 py-1 text-xs font-semibold text-surface"
                      }
                    >
                      {isOverdue ? "Overdue" : "Active"}
                    </span>
                  </header>

                  <dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div className="min-w-0">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                        Apparatus
                      </dt>
                      <dd className="mt-1 break-words text-ink">
                        {loan.items
                          .map((item) => `${item.name} x${item.quantity}`)
                          .join(", ")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                        Checked out
                      </dt>
                      <dd className="mt-1 text-ink">
                        {formatDateTime(loan.borrowedAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                        Due date
                      </dt>
                      <dd className="mt-1 text-ink">{formatDate(loan.dueAt)}</dd>
                    </div>
                  </dl>

                  <section
                    aria-label={`Staff remark for ${loan.studentName}`}
                    className="mt-4 flex min-w-0 flex-col gap-3 rounded-md bg-page p-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                        Staff remark
                      </h3>
                      <p className="mt-1 break-words whitespace-pre-wrap text-sm text-ink">
                        {loan.remarks?.trim() || "No staff remark recorded."}
                      </p>
                    </div>
                    <button
                      className="min-h-9 shrink-0 self-start rounded bg-maroon px-3 text-sm font-semibold text-surface hover:bg-charcoal disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      disabled={
                        savingRemarkId !== null ||
                        returningLoanId === loan.loanId
                      }
                      onClick={() => {
                        setRemarkDraft(loan.remarks ?? "");
                        setRemarkError("");
                        setRemarkEditorLoanId(loan.loanId);
                      }}
                      type="button"
                    >
                      {loan.remarks ? "Edit remark" : "Add remark"}
                    </button>
                  </section>

                  <footer className="mt-4 flex flex-wrap gap-2 border-t border-ink/15 pt-3">
                    <button
                      className="min-h-9 rounded border border-ink/30 px-3 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      onClick={() => setSelectedLoan(loan)}
                      type="button"
                    >
                      View slip
                    </button>
                    <button
                      className="min-h-9 rounded bg-maroon px-3 text-sm font-semibold text-surface hover:bg-charcoal disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      disabled={
                        returningLoanId === loan.loanId ||
                        savingRemarkId === loan.loanId
                      }
                      onClick={() => void confirmReturn(loan.loanId)}
                      type="button"
                    >
                      {returningLoanId === loan.loanId
                        ? "Processing..."
                        : "Confirm Return"}
                    </button>
                  </footer>
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-ink/20 bg-surface px-4 py-8 text-center text-sm text-ink">
          No active loans match your filters.
        </p>
      )}
      {remarkEditorLoan && (
        <Modal
          onClose={() => {
            if (savingRemarkId !== null) return;
            setRemarkEditorLoanId(null);
          }}
          title={remarkEditorLoan.remarks ? "Edit staff remark" : "Add staff remark"}
        >
          <form
            className="space-y-4 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveRemark();
            }}
          >
            <p className="text-sm text-ink">
              {remarkEditorLoan.studentName} · Loan #{remarkEditorLoan.loanId}
            </p>
            <label
              className="block text-sm font-semibold text-ink"
              htmlFor="staff-loan-remark"
            >
              Remark
              <textarea
                autoComplete="off"
                className="mt-1 min-h-28 w-full resize-y rounded border border-ink/30 bg-surface px-3 py-2 font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                id="staff-loan-remark"
                onChange={(event) => setRemarkDraft(event.target.value)}
                placeholder="Add a note about this loan..."
                value={remarkDraft}
              />
            </label>
            {remarkError && (
              <p className="rounded bg-alert px-3 py-2 text-sm text-alert-text" role="alert">
                {remarkError}
              </p>
            )}
            <p className="text-xs text-ink/70">
              Leave the remark empty to clear it.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="min-h-10 rounded border border-ink/30 px-4 text-sm font-semibold text-ink hover:bg-page disabled:opacity-60"
                disabled={savingRemarkId !== null}
                onClick={() => setRemarkEditorLoanId(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-10 rounded bg-maroon px-4 text-sm font-semibold text-surface hover:bg-charcoal disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                disabled={savingRemarkId !== null}
                type="submit"
              >
                {savingRemarkId !== null ? "Saving..." : "Save remark"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {selectedLoan && (
        <BorrowerSlip
          dueAt={new Date(selectedLoan.dueAt)}
          items={selectedLoan.items.map((item, index) => ({
            key: `loan-item:${index}`,
            name: item.name,
            quantity: item.quantity,
          }))}
          onClose={() => setSelectedLoan(null)}
          remarks={selectedLoan.remarks}
          studentId={selectedLoan.studentId}
          studentName={selectedLoan.studentName}
          submittedAt={new Date(selectedLoan.borrowedAt)}
          title="Borrower Slip"
        />
      )}
    </StaffShell>
  );
}
