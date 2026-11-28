"use client";

import { useEffect, useState } from "react";
import InstructorSignatureCapture from "@/components/ui/InstructorSignatureCapture";

type EndorsementItem = {
  loan_item_id?: number;
  apparatus_id?: number;
  variant_id?: number | null;
  name: string;
  quantity: number;
};

type EndorsementRequest = {
  loan_id: number;
  student_id: string;
  student_name: string;
  subject_name: string | null;
  instructor_name: string | null;
  instructor_endorsed: boolean;
  instructor_signature_data: string | null;
  endorsed_at: string | null;
  remarks: string | null;
  status: string;
  items: EndorsementItem[];
};

function isEndorsementRequest(value: unknown): value is EndorsementRequest {
  if (!value || typeof value !== "object") return false;
  return (
    "loan_id" in value &&
    typeof value.loan_id === "number" &&
    "student_id" in value &&
    typeof value.student_id === "string" &&
    "student_name" in value &&
    typeof value.student_name === "string" &&
    "items" in value &&
    Array.isArray(value.items) &&
    value.items.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "name" in item &&
        typeof item.name === "string" &&
        "quantity" in item &&
        typeof item.quantity === "number",
    ) &&
    "instructor_endorsed" in value &&
    typeof value.instructor_endorsed === "boolean"
  );
}

function errorMessage(value: unknown, fallback: string) {
  return value && typeof value === "object" && "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}

export default function EndorsementPortal({ token }: { token: string }) {
  const [request, setRequest] = useState<EndorsementRequest | null>(null);
  const [instructorName, setInstructorName] = useState("");
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadRequest() {
      try {
        const response = await fetch(
          `/api/borrow/endorse?token=${encodeURIComponent(token)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(errorMessage(payload, "Request not found."));
        if (!isEndorsementRequest(payload)) {
          throw new Error("The endorsement details are invalid.");
        }
        setRequest(payload);
        setInstructorName(payload.instructor_name ?? "");
        if (payload.instructor_endorsed) {
          setNotice("This borrowing request has already been endorsed.");
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load request.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadRequest();
    return () => controller.abort();
  }, [token]);

  async function submitEndorsement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!instructorName.trim() || !signature.trim()) {
      setError("Enter your name and provide a typed or drawn signature.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/borrow/endorse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endorsement_token: token,
          instructor_name: instructorName.trim(),
          instructor_signature_data: signature,
          endorsement_method: "digital",
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload, "Unable to submit endorsement."));
      setRequest((current) =>
        current
          ? {
              ...current,
              instructor_name: instructorName.trim(),
              instructor_endorsed: true,
              instructor_signature_data: signature,
              endorsed_at:
                payload && typeof payload === "object" &&
                "endorsed_at" in payload && typeof payload.endorsed_at === "string"
                  ? payload.endorsed_at
                  : new Date().toISOString(),
            }
          : current,
      );
      setNotice("Endorsement recorded. The Lab Tech will make the final approval and release decision.");
    } catch (submitError) {
      console.error("Unable to submit instructor endorsement:", submitError);
      setError(submitError instanceof Error ? submitError.message : "Unable to submit endorsement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 p-4 py-10 text-ink">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-maroon">Instructor review</p>
        <h1 className="text-2xl font-bold">Borrower&apos;s Slip</h1>
        <p className="text-sm text-ink/70">
          Review the student and item details before endorsing. Endorsement does not release equipment or deduct stock.
        </p>
      </header>

      {loading && <p role="status">Loading borrowing request…</p>}
      {error && <p className="rounded bg-alert px-4 py-3 text-sm text-alert-text" role="alert">{error}</p>}
      {!loading && request && (
        <div className="space-y-6 rounded-lg border border-ink/20 bg-surface p-5 shadow-sm">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-sm text-ink/70">Student Name</dt><dd className="font-semibold">{request.student_name}</dd></div>
            <div><dt className="text-sm text-ink/70">Student ID</dt><dd className="font-semibold">{request.student_id}</dd></div>
            <div><dt className="text-sm text-ink/70">Subject</dt><dd className="font-semibold">{request.subject_name || "Not provided"}</dd></div>
            <div><dt className="text-sm text-ink/70">Instructor</dt><dd className="font-semibold">{request.instructor_name || "Not provided"}</dd></div>
          </dl>

          <section aria-label="Requested apparatus">
            <h2 className="mb-2 font-semibold">Requested items</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead><tr className="bg-page">
                  <th className="border border-ink/30 px-3 py-2">Apparatus &amp; Variant</th>
                  <th className="border border-ink/30 px-3 py-2">Variant ID</th>
                  <th className="border border-ink/30 px-3 py-2 text-right">Qty</th>
                </tr></thead>
                <tbody>
                  {request.items.map((item, index) => (
                    <tr key={item.loan_item_id ?? index}>
                      <td className="border border-ink/30 px-3 py-2">{item.name}</td>
                      <td className="border border-ink/30 px-3 py-2">{item.variant_id ?? "—"}</td>
                      <td className="border border-ink/30 px-3 py-2 text-right">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-label="Remarks" className="rounded bg-page p-3">
            <h2 className="text-sm font-semibold">Remarks</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm">{request.remarks?.trim() || "No remarks provided."}</p>
          </section>

          {notice && <p className="rounded bg-success/10 px-3 py-2 text-sm" role="status">{notice}</p>}
          {request.instructor_endorsed ? (
            <p className="font-semibold text-success">Endorsed. Lab Tech approval is still required.</p>
          ) : request.status !== "pending" ? (
            <p className="rounded bg-alert px-3 py-2 text-sm text-alert-text">This request is no longer awaiting endorsement.</p>
          ) : (
            <form className="space-y-4 border-t border-ink/20 pt-4" onSubmit={(event) => void submitEndorsement(event)}>
              <label className="block text-sm font-semibold">
                Instructor Name
                <input
                  autoComplete="name"
                  className="mt-1 min-h-10 w-full rounded border border-ink/30 px-3 py-2 font-normal"
                  onChange={(event) => setInstructorName(event.target.value)}
                  required
                  value={instructorName}
                />
              </label>
              <InstructorSignatureCapture onChange={setSignature} />
              <button
                className="min-h-11 w-full rounded bg-maroon px-4 font-semibold text-surface disabled:cursor-wait disabled:opacity-60"
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Submitting endorsement…" : "Endorse Borrowing Request"}
              </button>
            </form>
          )}
        </div>
      )}
    </main>
  );
}
