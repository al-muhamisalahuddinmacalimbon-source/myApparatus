"use client";

import { Minus, Plus, X } from "lucide-react";

export type CartItem = {
  id: number;
  name: string;
  quantity: number;
  availableStock: number;
};

type CartDrawerProps = {
  cart: CartItem[];
  error: string;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onDecrease: (itemId: number) => void;
  onIncrease: (itemId: number) => void;
  onRemove: (itemId: number) => void;
  onSubmit: () => void;
};

export default function CartDrawer({
  cart,
  error,
  isOpen,
  isSubmitting,
  onClose,
  onDecrease,
  onIncrease,
  onRemove,
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
                <li className="border-b border-ink/20 pb-4 last:border-b-0" key={item.id}>
                  <p className="mb-2 font-semibold text-ink">{item.name}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      aria-label={`Decrease ${item.name} quantity`}
                      className="flex size-8 items-center justify-center rounded border border-ink/30 text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                      disabled={item.quantity <= 1}
                      onClick={() => onDecrease(item.id)}
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
                      onClick={() => onIncrease(item.id)}
                      type="button"
                    >
                      <Plus aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      className="ml-auto rounded border border-ink/30 px-3 py-1.5 text-sm font-semibold text-link hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      onClick={() => onRemove(item.id)}
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
