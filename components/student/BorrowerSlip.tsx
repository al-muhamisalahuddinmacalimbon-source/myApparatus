"use client";

import Modal from "../Modal";
import type { CartItem } from "./CartDrawer";

type BorrowerSlipProps = {
  items: CartItem[];
  onClose: () => void;
  studentId: string;
  studentName: string;
  submittedAt: Date;
  dueAt: Date;
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
}: BorrowerSlipProps) {
  return (
    <Modal onClose={onClose} title="Borrowing Request Submitted">
      <div className="space-y-4 p-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink/70">Student name</dt>
            <dd className="mt-1 font-semibold text-ink">{studentName}</dd>
          </div>
          <div>
            <dt className="text-ink/70">Student ID</dt>
            <dd className="mt-1 font-semibold text-ink">{studentId}</dd>
          </div>
        </dl>

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
                <tr key={item.id}>
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
          Please return on time
        </p>
        <button
          className="w-full rounded bg-maroon px-4 py-2.5 text-sm font-semibold text-surface hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
