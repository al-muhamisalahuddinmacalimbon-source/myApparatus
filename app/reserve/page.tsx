"use client";

import { useEffect, useMemo, useState } from "react";
import TopBar from "../../components/TopBar";
import { mockMachines, type Machine } from "../../lib/mockMachines";

type Reservation = {
  id: number;
  start_time: string;
  end_time: string;
  student_id?: string;
  student_name?: string;
  cancellation_status?: string | null;
  cancellation_staff_note?: string | null;
};

type CancellationRequestUpdate = {
  id: number;
  machine_name: string;
  start_time: string;
  status: string;
  staff_note: string | null;
};

type SelectedSlot = {
  start: Date;
  end: Date;
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

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(hour: number) {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${period}`;
}

function formatSlotTime(date: Date) {
  return formatTime(date.getHours());
}

function formatWeekday(date: Date) {
  return date.toLocaleDateString("en-GB", { weekday: "long" });
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isReservation(value: unknown): value is Reservation {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "start_time" in value &&
    typeof value.start_time === "string" &&
    "end_time" in value &&
    typeof value.end_time === "string" &&
    (!("student_id" in value) || typeof value.student_id === "string") &&
    (!("student_name" in value) || typeof value.student_name === "string") &&
    (!("cancellation_status" in value) ||
      value.cancellation_status === null ||
      typeof value.cancellation_status === "string") &&
    (!("cancellation_staff_note" in value) ||
      value.cancellation_staff_note === null ||
      typeof value.cancellation_staff_note === "string")
  );
}

function isCancellationRequestUpdate(
  value: unknown,
): value is CancellationRequestUpdate {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "machine_name" in value &&
    typeof value.machine_name === "string" &&
    "start_time" in value &&
    typeof value.start_time === "string" &&
    "status" in value &&
    typeof value.status === "string" &&
    "staff_note" in value &&
    (typeof value.staff_note === "string" || value.staff_note === null)
  );
}

async function getErrorMessage(response: Response, fallback: string) {
  const result: unknown = await response.json();
  return result &&
    typeof result === "object" &&
    "error" in result &&
    typeof result.error === "string"
    ? result.error
    : fallback;
}

export default function ReservePage() {
  const [weekOffset, setWeekOffset] = useState(1);
  const weekStart = useMemo(() => {
    const start = getMonday(new Date());
    start.setDate(start.getDate() + weekOffset * 7);
    return start;
  }, [weekOffset]);
  const weekDates = useMemo(
    () => days.map((_, index) => new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + index,
    )),
    [weekStart],
  );
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    return end;
  }, [weekStart]);

  const [selectedMachine, setSelectedMachine] = useState<Machine>(mockMachines[0]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState<string | undefined>();
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationRequests, setCancellationRequests] = useState<
    CancellationRequestUpdate[]
  >([]);
  const [cancellationRequestsError, setCancellationRequestsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const savedStudent = localStorage.getItem("student");
      if (!savedStudent) return;

      try {
        const parsed: unknown = JSON.parse(savedStudent);
        if (parsed && typeof parsed === "object") {
          if ("student_id" in parsed && typeof parsed.student_id === "string") {
            setStudentId(parsed.student_id);
          }
          if ("full_name" in parsed && typeof parsed.full_name === "string") {
            setStudentName(parsed.full_name);
          }
        }
      } catch (parseError) {
        console.error("Unable to restore the saved student.", parseError);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!studentId) return;
    const controller = new AbortController();

    async function loadCancellationRequests() {
      try {
        const response = await fetch(
          `/api/students/${encodeURIComponent(studentId)}/reservation-cancellation-requests`,
          { cache: "no-store", signal: controller.signal },
        );
        const result: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            await getErrorMessage(response, "Unable to load cancellation request updates."),
          );
        }
        if (
          !Array.isArray(result) ||
          !result.every(isCancellationRequestUpdate)
        ) {
          throw new Error("Cancellation request updates were returned in an unexpected format.");
        }
        setCancellationRequests(result);
        setCancellationRequestsError("");
      } catch (requestError) {
        if (controller.signal.aborted) return;
        console.error("Unable to load cancellation request updates.", requestError);
        setCancellationRequestsError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load cancellation request updates.",
        );
      }
    }

    void loadCancellationRequests();
    const interval = window.setInterval(() => void loadCancellationRequests(), 15_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [studentId]);

  useEffect(() => {
    let activeController: AbortController | null = null;
    let hasLoaded = false;

    async function loadReservations() {
      if (activeController) return;

      const controller = new AbortController();
      activeController = controller;
      if (!hasLoaded) setLoading(true);

      try {
        const query = new URLSearchParams({
          machine: selectedMachine.name,
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
        });
        const response = await fetch(`/api/reservations?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            await getErrorMessage(response, "Unable to load machine availability."),
          );
        }

        const result: unknown = await response.json();
        if (!Array.isArray(result) || !result.every(isReservation)) {
          throw new Error("The reservations API returned data in an unexpected format.");
        }
        setReservations(result);
        setError("");
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        console.error("Unable to load machine availability.", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load machine availability.",
        );
      } finally {
        if (activeController === controller) {
          activeController = null;
          hasLoaded = true;
          setLoading(false);
        }
      }
    }

    void loadReservations();

    const interval = window.setInterval(() => {
      void loadReservations();
    }, 10_000);
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") void loadReservations();
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
      activeController?.abort();
    };
  }, [selectedMachine, weekEnd, weekStart]);

  function makeSlot(date: Date, hour: number): SelectedSlot {
    const start = new Date(date);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    return { start, end };
  }

  function findReservation(slot: SelectedSlot) {
    return reservations.find(
      (reservation) =>
        new Date(reservation.start_time).getTime() === slot.start.getTime(),
    );
  }

  function openSlot(slot: SelectedSlot) {
    setNotice("");
    setCancellationReason("");
    setSelectedSlot(slot);
    setSelectedReservation(findReservation(slot) ?? null);
    setError("");
  }

  function closeBookingWindow() {
    if (submitting) return;
    setSelectedSlot(null);
    setSelectedReservation(null);
    setError("");
  }

  async function requestReservationCancellation() {
    if (!selectedReservation || !studentId) {
      setError("Student information is unavailable. Please sign in again.");
      return;
    }
    if (!cancellationReason.trim()) {
      setError("Please enter a reason for your cancellation request.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        `/api/reservations/${selectedReservation.id}/cancellation-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: studentId,
            reason: cancellationReason.trim(),
          }),
        },
      );
      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Unable to submit this cancellation request."),
        );
      }

      setReservations((current) =>
        current.map((reservation) =>
          reservation.id === selectedReservation.id
            ? { ...reservation, cancellation_status: "Pending" }
            : reservation,
        ),
      );
      setSelectedReservation((current) =>
        current ? { ...current, cancellation_status: "Pending" } : current,
      );
      setCancellationRequests((current) => [
        {
          id: Date.now(),
          machine_name: selectedMachine.name,
          start_time: selectedReservation.start_time,
          status: "Pending",
          staff_note: null,
        },
        ...current,
      ]);
      setCancellationReason("");
      setNotice("Cancellation request submitted.");
    } catch (requestError) {
      console.error("Unable to submit reservation cancellation request.", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to submit this cancellation request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmReservation() {
    if (!selectedSlot) return;
    if (!studentId.trim()) {
      setError("Student information is unavailable. Please sign in again.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machine: selectedMachine.name,
          student_id: studentId.trim(),
          start_time: selectedSlot.start.toISOString(),
          end_time: selectedSlot.end.toISOString(),
        }),
      });

      if (response.status === 409) {
        setError("Time slot was just reserved by another user.");
        setReservations((current) =>
          current.some(
            (reservation) =>
              new Date(reservation.start_time).getTime() ===
              selectedSlot.start.getTime(),
          )
            ? current
            : [
                ...current,
                {
                  id: Date.now(),
                  start_time: selectedSlot.start.toISOString(),
                  end_time: selectedSlot.end.toISOString(),
                  student_id: "",
                },
              ],
        );
        return;
      }
      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Unable to confirm this reservation."),
        );
      }

      const result: unknown = await response.json();
      if (!isReservation(result)) {
        throw new Error("The reservations API returned data in an unexpected format.");
      }
      setReservations((current) => [
        ...current,
        {
          ...result,
          student_id: studentId,
          student_name: studentName ?? "You",
        },
      ]);
      setSelectedSlot(null);
      setSelectedReservation(null);
      setNotice("Reservation confirmed.");
    } catch (submitError) {
      console.error("Unable to confirm reservation.", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to confirm this reservation.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <TopBar studentName={studentName} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <h1 className="mb-1 text-xl font-semibold text-ink">Shared Machines</h1>
        <p className="mb-4 text-sm text-ink">
          Select a machine, choose a time slot, and confirm your reservation.
        </p>

        {(cancellationRequests.length > 0 || cancellationRequestsError) && (
          <section
            aria-labelledby="cancellation-updates-heading"
            className="mb-5 rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-4"
          >
            <h2
              className="mb-3 font-semibold text-ink"
              id="cancellation-updates-heading"
            >
              Cancellation request updates
            </h2>
            {cancellationRequestsError && (
              <p className="mb-2 rounded bg-alert px-3 py-2 text-sm text-alert-text" role="alert">
                {cancellationRequestsError}
              </p>
            )}
            {cancellationRequests.length > 0 && (
              <ul className="space-y-2">
                {cancellationRequests.map((item) => (
                  <li
                    className="rounded-md border border-ink/20 bg-page p-3 text-sm text-ink"
                    key={item.id}
                  >
                    <p className="font-semibold">
                      {item.machine_name} · {formatDate(new Date(item.start_time))}
                      {" — "}
                      {item.status}
                    </p>
                    {item.status === "Pending" ? (
                      <p className="mt-1">Waiting for staff review.</p>
                    ) : (
                      <p className="mt-1">
                        {item.status === "Approved"
                          ? "Your reservation cancellation was approved."
                          : "Your reservation cancellation was declined."}
                        {item.staff_note ? ` Staff note: ${item.staff_note}` : ""}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section aria-labelledby="machine-selector-heading" className="mb-5">
          <h2
            className="mb-2 text-sm font-semibold text-ink"
            id="machine-selector-heading"
          >
            Machine selector
          </h2>
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
                  setSelectedSlot(null);
                  setSelectedReservation(null);
                  setError("");
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

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <section aria-labelledby="week-view-heading">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-ink" id="week-view-heading">
                Week view
              </h2>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-md border border-ink/40 bg-surface px-2 py-1 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  onClick={() => {
                    setWeekOffset((offset) => offset - 1);
                    setSelectedSlot(null);
                    setError("");
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
                    setSelectedSlot(null);
                    setError("");
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
                      key={dateKey(date)}
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
                      const reservation = findReservation(slot);
                      const isPast = slot.start.getTime() <= Date.now();

                      return (
                        <td
                          className="border-l border-t border-ink/20 p-0.5"
                          key={`${dateKey(date)}-${hour}`}
                        >
                          <button
                            aria-label={`${reservation ? reservation.student_id === studentId ? "Your reservation" : "Booked by another student" : isPast ? "Unavailable" : "Open"}: ${formatWeekday(date)} ${formatDate(date)}, ${formatTime(hour)}`}
                            className={`h-8 w-full rounded-sm text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                              reservation
                                ? reservation.student_id === studentId
                                  ? "cursor-pointer bg-link text-surface hover:bg-link/80"
                                  : "cursor-pointer bg-maroon text-surface hover:bg-maroon/90"
                                : isPast
                                  ? "cursor-not-allowed bg-page text-ink/50"
                                  : "bg-success text-surface hover:bg-success/80"
                            }`}
                            disabled={loading || Boolean(error && !selectedSlot) || isPast}
                            onClick={() => openSlot(slot)}
                            type="button"
                          >
                            {reservation
                              ? reservation.student_id === studentId
                                ? "Yours"
                                : "Booked"
                              : isPast
                                ? "—"
                                : ""}
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
              Loading machine availability...
            </p>
          )}
          {error && !selectedSlot && (
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
              Booked by another student
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="size-4 rounded-sm bg-link" />
              Your reservation
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="size-4 rounded-sm bg-page" />
              Unavailable
            </span>
          </div>
          </section>

          <aside
            aria-labelledby="booking-window-heading"
            className="rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface p-3"
            role={selectedSlot ? "dialog" : undefined}
          >
            <h2 className="mb-1 font-semibold text-ink" id="booking-window-heading">
              Booking window
            </h2>
            <p className="mb-3 text-sm text-ink">
              {selectedSlot
                ? selectedReservation
                  ? selectedReservation.student_id === studentId
                    ? selectedReservation.cancellation_status === "Pending"
                      ? "Your cancellation request is waiting for staff review."
                      : "Need to cancel? Send a request to the lab technician with your reason."
                    : "This time slot is booked by another student."
                  : "Confirm the selected reservation before submitting."
                : "Select an open time slot to book a machine."}
            </p>
            {selectedSlot ? (
              <div className="space-y-3">
                <dl className="grid grid-cols-2 gap-3 text-sm text-ink">
                  <dt>Machine</dt>
                  <dd className="text-right font-semibold">{selectedMachine.name}</dd>
                  <dt>Date</dt>
                  <dd className="text-right font-semibold">
                    {formatWeekday(selectedSlot.start)},{" "}
                    {formatDate(selectedSlot.start)}
                  </dd>
                  <dt>Start time</dt>
                  <dd className="text-right font-semibold">
                    {formatSlotTime(selectedSlot.start)}
                  </dd>
                  <dt>End time</dt>
                  <dd className="text-right font-semibold">
                    {formatSlotTime(selectedSlot.end)}
                  </dd>
                </dl>
                {selectedReservation && (
                  <dl className="grid grid-cols-2 gap-3 text-sm text-ink">
                    <dt>Reserved by</dt>
                    <dd className="text-right font-semibold">
                      {selectedReservation.student_name ??
                        (selectedReservation.student_id === studentId
                          ? studentName
                          : "Another student")}
                    </dd>
                  </dl>
                )}
                {selectedReservation?.student_id === studentId &&
                  selectedReservation.cancellation_status === "Pending" && (
                    <p className="rounded bg-page px-3 py-2 text-sm text-ink" role="status">
                      Cancellation request pending staff review.
                    </p>
                  )}
                {selectedReservation?.student_id === studentId &&
                  selectedReservation.cancellation_status === "Declined" &&
                  selectedReservation.cancellation_staff_note && (
                    <p className="rounded bg-alert px-3 py-2 text-sm text-alert-text">
                      Staff response: {selectedReservation.cancellation_staff_note}
                    </p>
                  )}
                {selectedReservation?.student_id === studentId &&
                  selectedReservation.cancellation_status !== "Pending" && (
                    <label className="block text-sm font-medium text-ink">
                      Reason for cancellation
                      <textarea
                        className="mt-1 min-h-20 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        maxLength={1000}
                        onChange={(event) => setCancellationReason(event.target.value)}
                        value={cancellationReason}
                      />
                    </label>
                  )}
                <dl className="grid grid-cols-2 gap-3 text-sm text-ink">
                  <dt>Student</dt>
                  <dd className="text-right font-semibold">
                    {studentName || "Signed-in student"}
                  </dd>
                  <dt>Student ID</dt>
                  <dd className="text-right font-semibold">{studentId || "Unavailable"}</dd>
                </dl>
                {error && (
                  <p className="rounded bg-alert px-3 py-2 text-sm text-alert-text" role="alert">
                    {error}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded-md border border-ink/40 bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                    disabled={submitting}
                    onClick={closeBookingWindow}
                    type="button"
                  >
                    Cancel
                  </button>
                  {selectedReservation?.student_id === studentId ? (
                    <button
                      className="flex-1 rounded-md bg-maroon px-3 py-2 text-sm font-semibold text-surface hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                      disabled={
                        submitting ||
                        selectedReservation.cancellation_status === "Pending"
                      }
                      onClick={requestReservationCancellation}
                      type="button"
                    >
                      {submitting
                        ? "Submitting..."
                        : selectedReservation.cancellation_status === "Pending"
                          ? "Request Pending"
                          : "Request Cancellation"}
                    </button>
                  ) : !selectedReservation ? (
                  <button
                    className="flex-1 rounded-md bg-maroon px-3 py-2 text-sm font-semibold text-surface hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                    disabled={submitting || Boolean(error)}
                    onClick={confirmReservation}
                    type="button"
                  >
                    {submitting ? "Confirming..." : "Confirm"}
                  </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="rounded-md border border-ink/20 bg-page p-3 text-sm text-ink">
                No time slot selected.
              </p>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
