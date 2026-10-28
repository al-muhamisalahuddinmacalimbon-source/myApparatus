"use client";

import { Menu, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";

type TopBarProps = {
  studentName?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  cartCount?: number;
  onCartClick?: () => void;
};

export default function TopBar({
  studentName,
  searchValue,
  onSearchChange,
  cartCount = 0,
  onCartClick,
}: TopBarProps) {
  return (
    <header className="flex h-14 items-center justify-between gap-4 bg-maroon px-4 text-surface sm:px-6">
      <div className="flex items-center gap-5">
        <Menu aria-hidden="true" className="size-4" />
        <Link className="font-bold" href="/home">
          myApparatus
        </Link>
      </div>
      {onSearchChange ? (
        <div className="flex min-w-0 items-center gap-3">
          <label className="flex h-9 min-w-0 items-center gap-2 rounded border border-ink/30 bg-surface px-3 text-ink sm:w-68">
            <Search aria-hidden="true" className="size-4 shrink-0" />
            <span className="sr-only">Search equipment</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/60"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search equipment"
              type="search"
              value={searchValue ?? ""}
            />
          </label>
          <button
            aria-label={`Cart, ${cartCount} items`}
            className="flex h-9 items-center gap-2 rounded border border-ink/30 bg-surface px-3 text-sm text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={onCartClick}
            type="button"
          >
            <ShoppingCart aria-hidden="true" className="size-4" />
            <span>Cart</span>
            <span className="rounded border border-ink/30 px-1.5 py-0.5 text-xs">
              {cartCount}
            </span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-6 text-sm">
          {studentName && <span>{studentName}</span>}
          <Link className="text-surface hover:underline" href="/">
            Logout
          </Link>
        </div>
      )}
    </header>
  );
}
