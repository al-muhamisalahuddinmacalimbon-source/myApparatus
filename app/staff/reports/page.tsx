"use client";

import { useState } from "react";
import StaffShell from "../../../components/StaffShell";

type LiabilityReportRow = {
  student_id: string;
  student_name: string;
  item_name: string;
  quantity: number;
  borrowed_date: string;
  days_overdue: number;
};

function isLiabilityReportRow(value: unknown): value is LiabilityReportRow {
  return (
    typeof value === "object" &&
    value !== null &&
    "student_id" in value &&
    typeof value.student_id === "string" &&
    "student_name" in value &&
    typeof value.student_name === "string" &&
    "item_name" in value &&
    typeof value.item_name === "string" &&
    "quantity" in value &&
    typeof value.quantity === "number" &&
    "borrowed_date" in value &&
    typeof value.borrowed_date === "string" &&
    "days_overdue" in value &&
    typeof value.days_overdue === "number"
  );
}

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function formatBorrowedDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export default function StaffReportsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState<LiabilityReportRow[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateReport() {
    if (startDate && endDate && startDate > endDate) {
      setError("Start date must be on or before end date.");
      return;
    }

    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    params.set("timeZone", Intl.DateTimeFormat().resolvedOptions().timeZone);

    try {
      const response = await fetch(
        `/api/admin/reports/liability?${params.toString()}`,
        { cache: "no-store" },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
            ? payload.error
            : "Unable to generate the liability report.",
        );
      }
      if (!Array.isArray(payload) || !payload.every(isLiabilityReportRow)) {
        throw new Error("The liability report returned data in an unexpected format.");
      }
      setRows(payload);
      setHasGenerated(true);
    } catch (reportError) {
      console.error("Unable to generate liability report:", reportError);
      setError(
        reportError instanceof Error
          ? reportError.message
          : "Unable to generate the liability report.",
      );
      setRows([]);
      setHasGenerated(false);
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    if (!hasGenerated) return;
    const csvRows = [
      [
        "Student ID",
        "Name",
        "Unreturned items",
        "Quantity",
        "Borrowed date",
        "Days overdue",
      ],
      ...rows.map((row) => [
        row.student_id,
        row.student_name,
        row.item_name,
        row.quantity,
        row.borrowed_date,
        row.days_overdue,
      ]),
    ];
    const csv = `\uFEFF${csvRows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const downloadUrl = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = downloadUrl;
    const now = new Date();
    const localDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    link.download = `liability-report-${localDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }

  return (
    <StaffShell>
      <h1 className="text-xl font-semibold text-ink">Liability report</h1>
      <p className="mb-4 text-sm text-ink">
        Overdue items with quantity not returned, borrowed date and days overdue.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="sr-only">Start date</span>
          <input
            aria-label="Start date"
            className="min-h-10 rounded-md border border-ink/40 bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onChange={(event) => setStartDate(event.target.value)}
            type="date"
            value={startDate}
          />
        </label>
        <label className="block">
          <span className="sr-only">End date</span>
          <input
            aria-label="End date"
            className="min-h-10 rounded-md border border-ink/40 bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onChange={(event) => setEndDate(event.target.value)}
            type="date"
            value={endDate}
          />
        </label>
        <button
          className="min-h-10 rounded-md bg-maroon px-4 py-2 text-sm font-semibold text-surface hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
          disabled={loading}
          onClick={() => void generateReport()}
          type="button"
        >
          {loading ? "Generating..." : "Generate Liability Report"}
        </button>
        <button
          className="min-h-10 rounded-md border border-ink/40 bg-surface px-4 py-2 text-sm font-semibold text-link hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasGenerated}
          onClick={exportCsv}
          type="button"
        >
          Export CSV
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded bg-alert px-3 py-2 text-sm text-alert-text" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm text-ink">
          <thead className="bg-page">
            <tr>
              <th className="px-3 py-3 font-semibold" scope="col">Student ID</th>
              <th className="px-3 py-3 font-semibold" scope="col">Name</th>
              <th className="px-3 py-3 font-semibold" scope="col">Unreturned items</th>
              <th className="px-3 py-3 font-semibold" scope="col">Quantity</th>
              <th className="px-3 py-3 font-semibold" scope="col">Borrowed date</th>
              <th className="px-3 py-3 font-semibold" scope="col">Days overdue</th>
            </tr>
          </thead>
          <tbody>
            {!hasGenerated ? (
              <tr>
                <td className="px-3 py-6 text-center text-ink/70" colSpan={6}>
                  Generate a liability report to view unreturned items.
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-ink/70" colSpan={6}>
                  No unreturned items found for the selected date range.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  className={`border-t border-ink/15 ${
                    row.days_overdue > 0
                      ? "bg-alert text-alert-text"
                      : ""
                  }`}
                  key={`${row.student_id}-${row.borrowed_date}-${row.item_name}-${index}`}
                >
                  <td className="px-3 py-3">{row.student_id}</td>
                  <td className="px-3 py-3">{row.student_name}</td>
                  <td className="px-3 py-3">{row.item_name}</td>
                  <td className="px-3 py-3">{row.quantity}</td>
                  <td className="px-3 py-3">{formatBorrowedDate(row.borrowed_date)}</td>
                  <td className="px-3 py-3">{row.days_overdue}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </StaffShell>
  );
}
