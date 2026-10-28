"use client";

import type { ReactNode } from "react";

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
  title: string;
};

export default function Modal({ children, onClose, title }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4"
      onClick={onClose}
    >
      <section
        aria-labelledby="modal-title"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-lg border border-ink/20 border-t-[3px] border-t-gold bg-surface shadow-lg"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h2
          className="border-b border-ink/20 px-4 py-3 text-lg font-semibold text-ink"
          id="modal-title"
        >
          {title}
        </h2>
        {children}
      </section>
    </div>
  );
}
