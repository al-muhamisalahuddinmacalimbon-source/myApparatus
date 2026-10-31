"use client";

import { useEffect, useMemo, useState } from "react";
import StaffShell from "../../../components/StaffShell";
import { mockMachines, type Machine } from "../../../lib/mockMachines";

type StaffReservation = {
  id: number;
  start_time: string;
  end_time: string;
  student_id: string;
  student_name: string;
  machine_name: string;
};

type CancellationRequest = {
  id: number;
  reservation_id: number;
  student_id: string;
  student_name: string;
  reason: string;
  status: "Pending" | "Approved" | "Declined";
  staff_note: string | null;
  created_at: string;
  start_time: string;
  end_time: string;
  machine_name: string;
};

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hours = Array.from({ length: 10 }, (_, index) => index + 8);

function getMonday(date: Date) {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  return monday;
}

function makeDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function makeSlot(date: Date, hour: number) {
  const start = new Date(date);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return { start, end };
}

function formatTime(hour: number) {
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${hour < 12 ? "AM" : "PM"}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isStaffReservation(value: unknown): value is StaffReservation {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "start_time" in value &&
    typeof value.start_time === "string" &&
    "end_time" in value &&
    typeof value.end_time === "string" &&
    "student_id" in value &&
    typeof value.student_id === "string" &&
    "student_name" in value &&
    typeof value.student_name === "string" &&
    "machine_name" in value &&
    typeof value.machine_name === "string"
  );
}

function isCancellationRequest(value: unknown): value is CancellationRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "reservation_id" in value &&
    typeof value.reservation_id === "number" &&
    "student_id" in value &&
    typeof value.student_id === "string" &&
    "student_name" in value &&
    typeof value.student_name === "string" &&
    "reason" in value &&
    typeof value.reason === "string" &&
    "status" in value &&
    (value.status === "Pending" ||
      value.status === "Approved" ||
      value.status === "Declined") &&
    "staff_note" in value &&
    (typeof value.staff_note === "string" || value.staff_note === null) &&
    "created_at" in value &&
    typeof value.created_at === "string" &&
    "start_time" in value &&
    typeof value.start_time === "string" &&
    "end_time" in value &&
    typeof value.end_time === "string" &&
    "machine_name" in value &&
    typeof value.machine_name === "string"
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

export default function StaffReservationsPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => {
    const start = getMonday(new Date());
    start.setDate(start.getDate() + weekOffset * 7);
    return start;
  }, [weekOffset]);
  const weekDates = useMemo(
    () =>
      days.map(
        (_, index) =>
          new Date(
            weekStart.getFullYear(),
            weekStart.getMonth(),
            weekStart.getDate() + index,
          ),
      ),
    [weekStart],
  );
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    return end;
  }, [weekStart]);

  const [selectedMachine, setSelectedMachine] = useState<Machine>(mockMachines[0]);
  const [reservations, setReservations] = useState<StaffReservation[]>([]);
  const [cancellationRequests, setCancellationRequests] = useState<
    CancellationRequest[]
  >([]);
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);
  const [staffNote, setStaffNote] = useState("");
  const [selectedReservation, setSelectedReservation] =
    useState<StaffReservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadReservations() {
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams({
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
          machine: selectedMachine.name,
        });
        const response = await fetch(`/api/admin/reservations?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload, "Unable to load reservations."),
          );
        }
        if (
          !Array.isArray(payload) ||
          !payload.every(isStaffReservation)
        ) {
          throw new Error("The reservations response was invalid.");
        }
        setReservations(payload);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error("Unable to load staff reservations:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load reservations.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadReservations();
    return () => controller.abort();
  }, [selectedMachine, weekEnd, weekStart]);

  useEffect(() => {
    let active = true;
    async function loadCancellationRequests() {
      try {
        const response = await fetch(
          "/api/admin/reservation-cancellation-requests",
          { cache: "no-store" },
        );
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload, "Unable to load cancellation requests."),
          );
        }
        if (
          !Array.isArray(payload) ||
          !payload.every(isCancellationRequest)
        ) {
          throw new Error("Cancellation requests were returned in an unexpected format.");
        }
        if (active) setCancellationRequests(payload);
      } catch (requestError) {
        if (!active) return;
        console.error("Unable to load cancellation requests:", requestError);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load cancellation requests.",
        );
      }
    }

    void loadCancellationRequests();
    const interval = window.setInterval(() => void loadCancellationRequests(), 15_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  function findReservation(start: Date) {
    return reservations.find(
      (reservation) =>
        new Date(reservation.start_time).getTime() === start.getTime(),
    );
  }

  async function cancelReservation() {
    if (!selectedReservation) return;
    setCancelling(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/admin/reservations/${selectedReservation.id}`,
        { method: "DELETE" },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Unable to cancel this reservation."),
        );
      }
      setReservations((current) =>
        current.filter(
          (reservation) => reservation.id !== selectedReservation.id,
        ),
      );
      setSelectedReservation(null);
      setNotice("Reservation cancelled.");
    } catch (cancelError) {
      console.error("Unable to cancel reservation for student:", cancelError);
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Unable to cancel this reservation.",
      );
    } finally {
      setCancelling(false);
    }
  }

  async function reviewCancellationRequest(
    cancellationRequest: CancellationRequest,
    decision: "Approved" | "Declined",
  ) {
    setCancelling(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/admin/reservation-cancellation-requests/${cancellationRequest.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, staff_note: staffNote }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Unable to review this cancellation request."),
        );
      }
      setCancellationRequests((current) =>
        current.map((item) =>
          item.id === cancellationRequest.id
            ? {
                ...item,
                status: decision,
                staff_note: staffNote.trim() || null,
              }
            : item,
        ),
      );
      if (decision === "Approved") {
        setReservations((current) =>
          current.filter(
            (item) => item.id !== cancellationRequest.reservation_id,
          ),
        );
        setSelectedReservation((current) =>
          current?.id === cancellationRequest.reservation_id ? null : current,
        );
      }
      setStaffNote("");
      setNotice(
        decision === "Approved"
          ? "Cancellation request approved."
          : "Cancellation request declined.",
      );
    } catch (reviewError) {
      console.error("Unable to review cancellation request:", reviewError);
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Unable to review this cancellation request.",
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <StaffShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink">Reservations</h1>
      </div>

      <section aria-label="Machine selector" className="mb-4">
        <div className="flex flex-wrap gap-2" role="tablist">
          {mockMachines.map((machine) => (
            <button
              aria-selected={selectedMachine.id === machine.id}
              className={
                selectedMachine.id === machine.id
                  ? "rounded-md bg-maroon px-3 py-1.5 text-sm font-semibold text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  : "rounded-md border border-ink/40 bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              }
              key={machine.id}
              onClick={() => {
                setSelectedMachine(machine);
                setSelectedReservation(null);
                setNotice("");
              }}
              role="tab"
              type="button"
            >
              {machine.name}
            </button>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-label={`${selectedMachine.name} reservation calendar`}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-ink">
              {selectedMachine.name} reservations
            </h2>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border border-ink/40 bg-surface px-2 py-1 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onClick={() => {
                  setWeekOffset((offset) => offset - 1);
                  setSelectedReservation(null);
                }}
                type="button"
              >
                Previous week
              </button>
              <p aria-live="polite" className="text-sm text-ink">
                {formatDate(weekDates[0])} – {formatDate(weekDates[5])}
              </p>
              <button
                className="rounded-md border border-ink/40 bg-surface px-2 py-1 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onClick={() => {
                  setWeekOffset((offset) => offset + 1);
                  setSelectedReservation(null);
                }}
                type="button"
              >
                Next week
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface">
            <table className="w-full min-w-[700px] table-fixed border-collapse text-center text-sm">
              <thead>
                <tr className="bg-page">
                  <th className="w-24 border-b border-ink/20 px-2 py-2 font-semibold text-ink">
                    Time
                  </th>
                  {weekDates.map((date) => (
                    <th
                      className="border-b border-ink/20 px-2 py-2 font-semibold text-ink"
                      key={makeDateKey(date)}
                    >
                      {date.toLocaleDateString("en-GB", { weekday: "short" })}
                      <span className="mt-0.5 block text-xs font-normal">
                        {date.toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map((hour) => (
                  <tr key={hour}>
                    <th className="border-r border-t border-ink/20 px-2 py-2 text-xs font-medium text-ink">
                      {formatTime(hour)}
                    </th>
                    {weekDates.map((date) => {
                      const slot = makeSlot(date, hour);
                      const reservation = findReservation(slot.start);
                      const past = slot.start.getTime() <= Date.now();
                      const selected = reservation?.id === selectedReservation?.id;

                      return (
                        <td
                          className="border-l border-t border-ink/20 p-0.5"
                          key={`${makeDateKey(date)}-${hour}`}
                        >
                          <button
                            aria-label={
                              reservation
                                ? `${reservation.student_name}, ${reservation.student_id}, ${selectedMachine.name}, ${formatDate(slot.start)}, ${formatTime(hour)}`
                                : `Open: ${formatDate(slot.start)}, ${formatTime(hour)}`
                            }
                            className={`h-9 w-full rounded-sm px-1 text-[10px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                              reservation
                                ? selected
                                  ? "bg-maroon text-surface ring-2 ring-accent"
                                  : "bg-maroon text-surface hover:bg-maroon/90"
                                : past
                                  ? "cursor-not-allowed bg-page text-ink/50"
                                  : "bg-success text-surface"
                            }`}
                            disabled={loading || !reservation}
                            onClick={() =>
                              reservation && setSelectedReservation(reservation)
                            }
                            title={
                              reservation
                                ? `${reservation.student_name} (${reservation.student_id})`
                                : undefined
                            }
                            type="button"
                          >
                            {reservation ? (
                              <span className="block truncate">
                                {reservation.student_name}
                              </span>
                            ) : past ? (
                              "—"
                            ) : (
                              ""
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading && (
            <p className="mt-2 text-sm text-ink" role="status">
              Loading reservations...
            </p>
          )}
          {error && (
            <p className="mt-3 rounded bg-alert px-3 py-2 text-sm text-alert-text" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="mt-3 rounded bg-success px-3 py-2 text-sm text-surface" role="status">
              {notice}
            </p>
          )}
          <div aria-label="Calendar legend" className="mt-3 flex flex-wrap gap-4 text-sm text-ink">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="size-4 rounded-sm bg-success" />
              Open
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="size-4 rounded-sm bg-maroon" />
              Booked
            </span>
          </div>
        </section>

        <aside className="rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-4">
          <h2 className="mb-3 font-semibold text-ink">Reservation details</h2>
          {selectedReservation ? (
            <>
              <dl className="grid grid-cols-2 gap-3 text-sm text-ink">
                <dt>Student</dt>
                <dd className="text-right font-semibold">
                  {selectedReservation.student_name}
                </dd>
                <dt>Student ID</dt>
                <dd className="text-right font-semibold">
                  {selectedReservation.student_id}
                </dd>
                <dt>Machine</dt>
                <dd className="text-right font-semibold">
                  {selectedReservation.machine_name}
                </dd>
                <dt>Date</dt>
                <dd className="text-right font-semibold">
                  {formatDate(new Date(selectedReservation.start_time))}
                </dd>
                <dt>Time</dt>
                <dd className="text-right font-semibold">
                  {new Date(selectedReservation.start_time).toLocaleTimeString(
                    "en-GB",
                    { hour: "2-digit", minute: "2-digit" },
                  )}{" "}
                  –{" "}
                  {new Date(selectedReservation.end_time).toLocaleTimeString(
                    "en-GB",
                    { hour: "2-digit", minute: "2-digit" },
                  )}
                </dd>
              </dl>
              <button
                className="mt-4 min-h-10 w-full rounded bg-maroon px-3 text-sm font-semibold text-surface hover:bg-charcoal disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                disabled={cancelling}
                onClick={() => void cancelReservation()}
                type="button"
              >
                {cancelling ? "Cancelling..." : "Cancel Reservation"}
              </button>
            </>
          ) : (
            <p className="rounded-md border border-ink/20 bg-page p-3 text-sm text-ink">
              Select a booked calendar slot to view the reservation details.
            </p>
          )}
        </aside>
      </div>

      <section
        aria-labelledby="cancellation-requests-heading"
        className="mt-6 rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-4"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-ink" id="cancellation-requests-heading">
            Reservation cancellation requests
          </h2>
          <span className="rounded-full bg-alert px-3 py-1 text-xs font-semibold text-alert-text">
            {cancellationRequests.filter((item) => item.status === "Pending").length} pending
          </span>
        </div>
        {cancellationRequests.length === 0 ? (
          <p className="rounded-md border border-ink/20 bg-page p-3 text-sm text-ink">
            No cancellation requests.
          </p>
        ) : (
          <ul className="space-y-2">
            {cancellationRequests.map((item) => {
              const expanded = expandedRequestId === item.id;
              return (
                <li className="rounded-md border border-ink/20" key={item.id}>
                  <button
                    aria-expanded={expanded}
                    className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-left hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    onClick={() => {
                      setExpandedRequestId(expanded ? null : item.id);
                      setStaffNote(item.staff_note ?? "");
                    }}
                    type="button"
                  >
                    <span className="font-semibold text-ink">
                      {item.student_name} ({item.student_id}) — {item.machine_name}
                    </span>
                    <span
                      className={
                        item.status === "Pending"
                          ? "rounded-full bg-alert px-2 py-1 text-xs font-semibold text-alert-text"
                          : "rounded-full bg-success px-2 py-1 text-xs font-semibold text-surface"
                      }
                    >
                      {item.status}
                    </span>
                  </button>
                  {expanded && (
                    <div className="space-y-3 border-t border-ink/20 p-3 text-sm text-ink">
                      <dl className="grid gap-1 sm:grid-cols-2">
                        <dt className="font-semibold">Reservation</dt>
                        <dd>
                          {formatDate(new Date(item.start_time))},{" "}
                          {new Date(item.start_time).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" – "}
                          {new Date(item.end_time).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </dd>
                        <dt className="font-semibold">Requested</dt>
                        <dd>{new Date(item.created_at).toLocaleString()}</dd>
                        <dt className="font-semibold">Reason</dt>
                        <dd className="sm:col-span-2 whitespace-pre-wrap">{item.reason}</dd>
                      </dl>
                      {item.status === "Pending" ? (
                        <>
                          <label className="block font-semibold">
                            Staff note for the student
                            <textarea
                              className="mt-1 min-h-20 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                              maxLength={1000}
                              onChange={(event) => setStaffNote(event.target.value)}
                              value={staffNote}
                            />
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded-md bg-maroon px-3 py-2 font-semibold text-surface hover:bg-charcoal disabled:opacity-60"
                              disabled={cancelling}
                              onClick={() =>
                                void reviewCancellationRequest(item, "Approved")
                              }
                              type="button"
                            >
                              Approve
                            </button>
                            <button
                              className="rounded-md border border-ink/40 bg-surface px-3 py-2 font-semibold text-ink hover:bg-page disabled:opacity-60"
                              disabled={cancelling}
                              onClick={() =>
                                void reviewCancellationRequest(item, "Declined")
                              }
                              type="button"
                            >
                              Decline
                            </button>
                          </div>
                        </>
                      ) : (
                        <p>
                          Staff note: {item.staff_note || "No note provided."}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </StaffShell>
  );
}
