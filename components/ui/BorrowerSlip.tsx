"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import type { CartItem } from "./CartDrawer";
import InstructorSignatureCapture from "./InstructorSignatureCapture";

type BorrowerSlipProps = {
  items: Array<Pick<CartItem, "key" | "name" | "quantity">>;
  onClose: () => void;
  studentId: string;
  studentName: string;
  submittedAt: Date;
  dueAt: Date;
  remarks: string | null;
  endorsementToken?: string | null;
  subjectName?: string | null;
  instructorName?: string | null;
  mockFallback?: boolean;
  title?: string;
};

function formatBorrowDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDueDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function BorrowerSlip({
  items,
  onClose,
  studentId,
  studentName,
  submittedAt,
  dueAt,
  remarks,
  endorsementToken = null,
  subjectName = null,
  instructorName = "",
  mockFallback = false,
  title = "Borrowing Request Submitted",
}: BorrowerSlipProps) {
  const [showSignOff, setShowSignOff] = useState(false);
  const [typedInstructorName, setTypedInstructorName] = useState(instructorName ?? "");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [endorsed, setEndorsed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function copyInstructorMessage() {
    if (!endorsementToken) return;
    const link = `${window.location.origin}/endorse/${endorsementToken}`;
    const message = `Hello ${instructorName || "Instructor"}, please review and endorse my borrowing request for ${subjectName || "my subject"}: ${link}`;
    try {
      await navigator.clipboard.writeText(message);
      setNotice("Instructor message and endorsement link copied.");
    } catch (copyError) {
      console.error("Unable to copy the endorsement message:", copyError);
      setError("Could not copy automatically. You can open the link below and copy it.");
    }
  }

  async function submitInPersonEndorsement() {
    if (!endorsementToken || !typedInstructorName.trim() || !signature.trim()) {
      setError("Instructor name and typed or drawn signature are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/borrow/endorse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endorsement_token: endorsementToken,
          instructor_name: typedInstructorName.trim(),
          instructor_signature_data: signature,
          endorsement_method: "in_person",
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload &&
            typeof payload.error === "string"
            ? payload.error
            : "Unable to record instructor endorsement.",
        );
      }
      setNotice("Instructor endorsement recorded. Lab Tech approval is still required.");
      setEndorsed(true);
      setShowSignOff(false);
    } catch (submitError) {
      console.error("Unable to record in-person endorsement:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to record instructor endorsement.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} title={title}>
      <div className="space-y-4 p-4">
        {mockFallback && (
          <p className="rounded bg-alert px-3 py-2 text-sm text-alert-text" role="alert">
            Offline mock mode: this request is only stored in this server instance and may not survive a restart.
          </p>
        )}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink/70">Student name</dt>
            <dd className="mt-1 font-semibold text-ink">{studentName}</dd>
          </div>
          <div>
            <dt className="text-ink/70">Student ID</dt>
            <dd className="mt-1 font-semibold text-ink">{studentId}</dd>
          </div>
          {(subjectName || instructorName) && (
            <>
              <div>
                <dt className="text-ink/70">Subject</dt>
                <dd className="mt-1 font-semibold text-ink">{subjectName || "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-ink/70">Instructor</dt>
                <dd className="mt-1 font-semibold text-ink">{instructorName || "Not provided"}</dd>
              </div>
            </>
          )}
        </dl>

        <section
          aria-label="Staff remark"
          className="rounded border border-ink/20 bg-page p-3 text-sm"
        >
          <h3 className="font-semibold text-ink">Staff remark</h3>
          <p className="mt-1 whitespace-pre-wrap text-ink">
            {remarks?.trim() || "No staff remark recorded."}
          </p>
        </section>

        <section aria-label="Borrowed items">
          <h3 className="mb-2 text-sm font-semibold text-ink">Borrowed items</h3>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-page">
                <th className="border border-ink/30 px-2 py-2 font-semibold text-ink">
                  Item
                </th>
                <th className="border border-ink/30 px-2 py-2 text-right font-semibold text-ink">
                  Quantity
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.key}>
                  <td className="border border-ink/30 px-2 py-2 text-ink">{item.name}</td>
                  <td className="border border-ink/30 px-2 py-2 text-right text-ink">
                    {item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink/70">Borrow date and time</dt>
            <dd className="mt-1 font-semibold text-ink">
              {formatBorrowDate(submittedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-ink/70">Due date</dt>
            <dd className="mt-1 font-semibold text-ink">{formatDueDate(dueAt)}</dd>
          </div>
        </dl>

        <p className="bg-alert px-3 py-2 text-sm text-alert-text">
          {endorsementToken
            ? "Awaiting instructor endorsement and Lab Tech approval. Stock is deducted only when the Lab Tech releases the request."
            : "Please return on time"}
        </p>
        {endorsementToken && (
          <section className="space-y-2 border-t border-ink/20 pt-3">
            <label className="block break-all text-sm text-ink">
              Instructor endorsement link
              <input
                className="mt-1 min-h-10 w-full rounded border border-ink/30 bg-page px-3 py-2 text-xs"
                readOnly
                value={`${typeof window === "undefined" ? "" : window.location.origin}/endorse/${endorsementToken}`}
              />
            </label>
            {!endorsed && (
              <>
                <button
                  className="min-h-10 w-full rounded border border-maroon px-4 text-sm font-semibold text-maroon"
                  onClick={() => void copyInstructorMessage()}
                  type="button"
                >
                  Copy Message &amp; Link for Instructor
                </button>
                <button
                  className="min-h-10 w-full rounded bg-maroon px-4 text-sm font-semibold text-surface"
                  onClick={() => {
                    setError("");
                    setShowSignOff(true);
                  }}
                  type="button"
                >
                  In-Person Instructor Sign-Off
                </button>
              </>
            )}
          </section>
        )}
        {notice && <p className="text-sm text-success" role="status">{notice}</p>}
        {error && <p className="rounded bg-alert px-3 py-2 text-sm text-alert-text" role="alert">{error}</p>}
        <button
          className="w-full rounded bg-maroon px-4 py-2.5 text-sm font-semibold text-surface hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
      {showSignOff && (
        <Modal onClose={() => setShowSignOff(false)} title="In-Person Instructor Sign-Off">
          <div className="max-h-[80vh] space-y-4 overflow-y-auto p-4">
            <section aria-label="Itemized borrowing request">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-page">
                    <th className="border border-ink/30 px-2 py-2">Apparatus &amp; Variant</th>
                    <th className="border border-ink/30 px-2 py-2 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.key}>
                      <td className="border border-ink/30 px-2 py-2">{item.name}</td>
                      <td className="border border-ink/30 px-2 py-2 text-right">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <label className="block text-sm font-semibold text-ink">
              Instructor Name
              <input
                className="mt-1 min-h-10 w-full rounded border border-ink/30 px-3 py-2"
                onChange={(event) => setTypedInstructorName(event.target.value)}
                value={typedInstructorName}
              />
            </label>
            <InstructorSignatureCapture onChange={setSignature} />
            {error && <p className="rounded bg-alert px-3 py-2 text-sm text-alert-text" role="alert">{error}</p>}
            <button
              className="min-h-10 w-full rounded bg-maroon px-4 text-sm font-semibold text-surface disabled:opacity-60"
              disabled={submitting}
              onClick={() => void submitInPersonEndorsement()}
              type="button"
            >
              {submitting ? "Recording..." : "Record Instructor Sign-Off"}
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
