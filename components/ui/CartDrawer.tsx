"use client";

import { Minus, Plus, X } from "lucide-react";
import type { ApparatusVariant } from "@/types/apparatus";

export type CartItem = {
  key: string;
  apparatusId: number;
  variantId: number | null;
  parentName: string;
  name: string;
  quantity: number;
  availableStock: number;
  variants: ApparatusVariant[];
};

type CartDrawerProps = {
  cart: CartItem[];
  error: string;
  isOpen: boolean;
  isSubmitting: boolean;
  subjectName: string;
  instructorName: string;
  onClose: () => void;
  onDecrease: (itemKey: string) => void;
  onIncrease: (itemKey: string) => void;
  onRemove: (itemKey: string) => void;
  onVariantChange: (itemKey: string, variantId: number) => void;
  onSubjectNameChange: (value: string) => void;
  onInstructorNameChange: (value: string) => void;
  onSubmit: () => void;
};

export default function CartDrawer({
  cart,
  error,
  isOpen,
  isSubmitting,
  subjectName,
  instructorName,
  onClose,
  onDecrease,
  onIncrease,
  onRemove,
  onVariantChange,
  onSubjectNameChange,
  onInstructorNameChange,
  onSubmit,
}: CartDrawerProps) {
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-40 ${isOpen ? "" : "pointer-events-none"}`}
      inert={!isOpen}
    >
      <button
        aria-label="Close cart"
        className={`absolute inset-0 bg-charcoal/40 transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
        type="button"
      />
      <aside
        aria-labelledby="cart-title"
        className={`absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-t-[3px] border-t-gold bg-surface shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
      >
        <header className="flex items-center justify-between border-b border-ink/20 px-4 py-4">
          <h2 className="text-lg font-semibold text-ink" id="cart-title">
            Your Cart
          </h2>
          <button
            aria-label="Close cart"
            className="rounded p-1 text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <p className="text-sm text-ink">
              Cart is empty. Please select equipment before submitting.
            </p>
          ) : (
            <ul className="space-y-4">
              {cart.map((item) => (
                <li className="border-b border-ink/20 pb-4 last:border-b-0" key={item.key}>
                  <p className="mb-2 font-semibold text-ink">{item.name}</p>
                  {item.variants.length > 0 && (
                    <label className="mb-2 block text-sm font-medium text-ink">
                      Size / material
                      <select
                        className="mt-1 min-h-10 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        onChange={(event) =>
                          onVariantChange(item.key, Number(event.target.value))
                        }
                        value={item.variantId ?? ""}
                      >
                        {item.variants.map((variant) => (
                          <option
                            disabled={
                              variant.status !== "Active" ||
                              variant.available_stock <= 0
                            }
                            key={variant.id}
                            value={variant.id}
                          >
                            {variant.name}
                            {variant.status !== "Active" ? " (Inactive)" : ""}
                            {variant.available_stock <= 0 ? " (Out of stock)" : ""}
                          </option>
                        ))}
                      </select>
                      {item.variants.find(
                        (variant) => variant.id === item.variantId,
                      ) && (
                        <span className="mt-1 block text-xs font-normal text-ink/70">
                          In Stock:{" "}
                          {
                            item.variants.find(
                              (variant) => variant.id === item.variantId,
                            )?.total_stock
                          }{" "}
                          · Available: {item.availableStock}
                        </span>
                      )}
                    </label>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      aria-label={`Decrease ${item.name} quantity`}
                      className="flex size-8 items-center justify-center rounded border border-ink/30 text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                      disabled={item.quantity <= 1}
                      onClick={() => onDecrease(item.key)}
                      type="button"
                    >
                      <Minus aria-hidden="true" className="size-4" />
                    </button>
                    <span aria-live="polite" className="min-w-5 text-center text-sm text-ink">
                      {item.quantity}
                    </span>
                    <button
                      aria-label={`Increase ${item.name} quantity`}
                      className="flex size-8 items-center justify-center rounded border border-ink/30 text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                      disabled={item.quantity >= item.availableStock}
                      onClick={() => onIncrease(item.key)}
                      type="button"
                    >
                      <Plus aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      className="ml-auto rounded border border-ink/30 px-3 py-1.5 text-sm font-semibold text-link hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      onClick={() => onRemove(item.key)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-ink/20 p-4">
          <p className="mb-3 text-sm font-semibold text-ink">
            Total items: {itemCount}
          </p>
          <div className="mb-3 grid gap-3">
            <label className="text-sm font-medium text-ink">
              Subject
              <input
                autoComplete="off"
                className="mt-1 min-h-10 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onChange={(event) => onSubjectNameChange(event.target.value)}
                required
                value={subjectName}
              />
            </label>
            <label className="text-sm font-medium text-ink">
              Instructor Name
              <input
                autoComplete="name"
                className="mt-1 min-h-10 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onChange={(event) => onInstructorNameChange(event.target.value)}
                required
                value={instructorName}
              />
            </label>
          </div>
          {error && (
            <p className="mb-3 rounded bg-alert px-3 py-2 text-sm text-alert-text" role="alert">
              {error}
            </p>
          )}
          <button
            className="w-full rounded bg-maroon px-4 py-2.5 text-sm font-semibold text-surface hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            disabled={itemCount === 0 || isSubmitting}
            onClick={onSubmit}
            type="button"
          >
            {isSubmitting ? "Submitting..." : "Submit Borrower Slip"}
          </button>
        </footer>
      </aside>
    </div>
  );
}
