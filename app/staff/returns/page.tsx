"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import StaffShell from "../../../components/StaffShell";
import type {
  BorrowingHistoryItem,
  StudentBorrowingHistory,
} from "../../../lib/mockLoans";

function isHistoryItem(value: unknown): value is BorrowingHistoryItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "loanItemId" in value &&
    typeof value.loanItemId === "number" &&
    "name" in value &&
    typeof value.name === "string" &&
    "quantity" in value &&
    typeof value.quantity === "number" &&
    "returnedQuantity" in value &&
    typeof value.returnedQuantity === "number" &&
    "activeQuantity" in value &&
    typeof value.activeQuantity === "number"
  );
}

function isStudentBorrowingHistory(
  value: unknown,
): value is StudentBorrowingHistory {
  return (
    typeof value === "object" &&
    value !== null &&
    "studentId" in value &&
    typeof value.studentId === "string" &&
    "studentName" in value &&
    typeof value.studentName === "string" &&
    "loans" in value &&
    Array.isArray(value.loans) &&
    value.loans.every(
      (loan) =>
        typeof loan === "object" &&
        loan !== null &&
        "loanId" in loan &&
        typeof loan.loanId === "number" &&
        "borrowedAt" in loan &&
        typeof loan.borrowedAt === "string" &&
        "dueAt" in loan &&
        typeof loan.dueAt === "string" &&
        "returnedAt" in loan &&
        (typeof loan.returnedAt === "string" || loan.returnedAt === null) &&
        "status" in loan &&
        (loan.status === "Active" ||
          loan.status === "Overdue" ||
          loan.status === "Returned") &&
        "items" in loan &&
        Array.isArray(loan.items) &&
        loan.items.every(isHistoryItem),
    )
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
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function StaffReturnsPage() {
  const [studentIdInput, setStudentIdInput] = useState("");
  const [history, setHistory] = useState<StudentBorrowingHistory | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [showActiveLoans, setShowActiveLoans] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [processingLoanId, setProcessingLoanId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadStudent = useCallback(async (studentId: string) => {
    setLoadingStudent(true);
    setError("");
    setConfirmation("");
    setHistory(null);
    setSelectedItemIds(new Set());
    setShowActiveLoans(false);

    try {
      const response = await fetch(
        `/api/admin/returns?student_id=${encodeURIComponent(studentId)}`,
        { cache: "no-store" },
      );
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Unable to load this student's borrowing history."),
        );
      }
      if (!isStudentBorrowingHistory(payload)) {
        throw new Error("The borrowing history response was invalid.");
      }

      setHistory(payload);
    } catch (loadError) {
      console.error("Unable to load student borrowing history:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load this student's borrowing history.",
      );
    } finally {
      setLoadingStudent(false);
      inputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleScanSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const scannedStudentId = studentIdInput.trim();
    if (!scannedStudentId) {
      setError("Scan or enter a Student ID.");
      inputRef.current?.focus();
      return;
    }

    setStudentIdInput("");
    await loadStudent(scannedStudentId);
  }

  function toggleItem(itemId: number) {
    setSelectedItemIds((current) => {
      const updated = new Set(current);
      if (updated.has(itemId)) {
        updated.delete(itemId);
      } else {
        updated.add(itemId);
      }
      return updated;
    });
    setConfirmation("");
  }

  async function submitReturn(
    loanId: number,
    itemIds: number[],
    partial: boolean,
  ) {
    if (!history || itemIds.length === 0) return;

    setProcessingLoanId(loanId);
    setError("");
    setConfirmation("");

    try {
      const response = await fetch("/api/admin/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: history.studentId,
          item_ids: itemIds,
        }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Unable to confirm this return."));
      }

      await loadStudent(history.studentId);
      setShowActiveLoans(true);
      setConfirmation(
        partial ? "Partial return confirmed." : "Return confirmed.",
      );
    } catch (returnError) {
      console.error("Unable to confirm student return:", returnError);
      setError(
        returnError instanceof Error
          ? returnError.message
          : "Unable to confirm this return.",
      );
    } finally {
      setProcessingLoanId(null);
    }
  }

  const activeLoans =
    history?.loans.filter((loan) =>
      loan.items.some((item) => item.activeQuantity > 0),
    ) ?? [];
  const activeLoanCount = activeLoans.length;

  return (
    <StaffShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink">Returns</h1>
        {history && (
          <p className="text-sm font-semibold text-ink">
            Student: {history.studentName} ({history.studentId})
          </p>
        )}
      </div>

      <section className="mb-4 rounded-lg border border-ink/40 border-t-[3px] border-t-accent bg-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-ink">Scan student ID barcode</h2>
          <span className="text-xs text-ink/70">Auto-focused field</span>
        </div>
        <form onSubmit={handleScanSubmit}>
          <label className="sr-only" htmlFor="return-student-id">
            Student ID
          </label>
          <input
            ref={inputRef}
            autoComplete="off"
            className="h-10 w-full rounded border border-ink/50 bg-page px-3 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            id="return-student-id"
            onChange={(event) => {
              setStudentIdInput(event.target.value);
              setError("");
              setConfirmation("");
            }}
            placeholder="Scan or enter Student ID, then press Enter"
            type="text"
            value={studentIdInput}
          />
          <button className="sr-only" type="submit">
            Load student history
          </button>
        </form>

        {history && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-ink">
            <p>
              <span className="font-semibold">Student:</span>{" "}
              {history.studentName} ({history.studentId})
            </p>
            <p>
              <span className="font-semibold">Borrowing records:</span>{" "}
              {history.loans.length}
            </p>
            <p>
              <span className="font-semibold">Active loans:</span>{" "}
              {activeLoanCount}
            </p>
          </div>
        )}
      </section>

      {error && (
        <p
          className="mb-4 rounded border border-ink/20 bg-alert px-4 py-3 text-sm text-alert-text"
          role="alert"
        >
          {error}
        </p>
      )}
      {confirmation && (
        <p
          className="mb-4 rounded border border-ink/20 bg-success px-4 py-3 text-sm font-semibold text-surface"
          role="status"
        >
          {confirmation}
        </p>
      )}
      {loadingStudent && (
        <p className="mb-4 text-sm text-ink" role="status">
          Loading borrowing history...
        </p>
      )}

      {history && (
        <>
          <section aria-label="Borrowing history">
            <h2 className="mb-3 font-semibold text-ink">Borrowing History</h2>
            {history.loans.length > 0 ? (
              <div className="space-y-3">
                {history.loans.map((loan) => {
                  const returnedAt = loan.returnedAt
                    ? formatDateTime(loan.returnedAt)
                    : null;
                  return (
                    <article
                      className="overflow-hidden rounded-lg border border-ink/35 border-t-[3px] border-t-accent bg-surface"
                      key={loan.loanId}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 bg-page px-4 py-3">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink">
                          <span className="font-semibold">
                            Borrowed {formatDateTime(loan.borrowedAt)}
                          </span>
                          <span>Due {formatDate(loan.dueAt)}</span>
                          {returnedAt && <span>Returned {returnedAt}</span>}
                        </div>
                        <span
                          className={
                            loan.status === "Returned"
                              ? "rounded bg-success px-2 py-1 text-xs font-semibold text-surface"
                              : loan.status === "Overdue"
                                ? "rounded bg-alert px-2 py-1 text-xs font-semibold text-alert-text"
                                : "rounded border border-ink/30 px-2 py-1 text-xs font-semibold text-ink"
                          }
                        >
                          {loan.status}
                        </span>
                      </div>
                      <ul className="divide-y divide-ink/15">
                        {loan.items.map((item) => (
                          <li
                            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm text-ink"
                            key={item.loanItemId}
                          >
                            <span className="font-medium">{item.name}</span>
                            <span>
                              Borrowed: {item.quantity}
                              {item.returnedQuantity > 0 &&
                                ` · Returned: ${item.returnedQuantity}`}
                              {item.activeQuantity > 0 &&
                                ` · Still active: ${item.activeQuantity}`}
                            </span>
                          </li>
                        ))}
                        {loan.items.length === 0 && (
                          <li className="px-4 py-3 text-sm text-ink/70">
                            No apparatus details are recorded for this loan.
                          </li>
                        )}
                      </ul>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-4 text-sm text-ink">
                No borrowing history for this student.
              </p>
            )}
          </section>

          <section className="mt-5">
            <button
              aria-expanded={showActiveLoans}
              className="flex min-h-11 w-full items-center justify-between rounded-lg border border-ink/35 border-t-[3px] border-t-accent bg-surface px-4 text-left font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={() => setShowActiveLoans((shown) => !shown)}
              type="button"
            >
              <span>Active Loans ({activeLoanCount})</span>
              {showActiveLoans ? (
                <ChevronUp aria-hidden="true" className="size-5" />
              ) : (
                <ChevronDown aria-hidden="true" className="size-5" />
              )}
            </button>

            {showActiveLoans && (
              <div className="mt-3 space-y-3">
                {activeLoans.length > 0 ? (
                  activeLoans.map((loan) => {
                    const activeItems = loan.items.filter(
                      (item) => item.activeQuantity > 0,
                    );
                    const selectedIds = activeItems
                      .filter((item) => selectedItemIds.has(item.loanItemId))
                      .map((item) => item.loanItemId);
                    return (
                      <article
                        className="overflow-hidden rounded-lg border border-ink/35 border-t-[3px] border-t-accent bg-surface"
                        key={loan.loanId}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/15 px-4 py-3 text-sm text-ink">
                          <span className="font-semibold">
                            Borrowed {formatDateTime(loan.borrowedAt)}
                          </span>
                          <span>Due {formatDate(loan.dueAt)}</span>
                        </div>
                        <ul className="divide-y divide-ink/15">
                          {activeItems.map((item) => (
                            <li
                              className="flex items-center gap-3 px-4 py-3 text-sm text-ink"
                              key={item.loanItemId}
                            >
                              <input
                                aria-label={`Select ${item.name}`}
                                checked={selectedItemIds.has(item.loanItemId)}
                                className="size-5 accent-maroon focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                disabled={processingLoanId !== null}
                                onChange={() => toggleItem(item.loanItemId)}
                                type="checkbox"
                              />
                              <span className="flex-1 font-medium">
                                {item.name}
                              </span>
                              <span>Qty: {item.activeQuantity}</span>
                              <span>Due: {formatDate(loan.dueAt)}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-wrap gap-2 border-t border-ink/15 p-3">
                          <button
                            className="min-h-10 rounded bg-maroon px-4 text-sm font-semibold text-surface hover:bg-charcoal disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            disabled={processingLoanId !== null}
                            onClick={() =>
                              void submitReturn(
                                loan.loanId,
                                activeItems.map((item) => item.loanItemId),
                                false,
                              )
                            }
                            type="button"
                          >
                            {processingLoanId === loan.loanId
                              ? "Processing..."
                              : "Confirm Return"}
                          </button>
                          <button
                            className="min-h-10 rounded bg-maroon px-4 text-sm font-semibold text-surface hover:bg-charcoal disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            disabled={
                              processingLoanId !== null || selectedIds.length === 0
                            }
                            onClick={() =>
                              void submitReturn(loan.loanId, selectedIds, true)
                            }
                            type="button"
                          >
                            {processingLoanId === loan.loanId
                              ? "Processing..."
                              : "Confirm Partial Return"}
                          </button>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="rounded-lg border border-ink/30 bg-surface p-4 text-sm text-ink">
                    This student has no active loans.
                  </p>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </StaffShell>
  );
}
