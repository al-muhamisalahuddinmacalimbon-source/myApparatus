"use client";

import { useState } from "react";
import { Menu, Search, ShoppingCart, X } from "lucide-react";
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
  const [isStudentMenuOpen, setIsStudentMenuOpen] = useState(false);

  function closeStudentMenu() {
    setIsStudentMenuOpen(false);
  }

  function logOut() {
    localStorage.removeItem("student");
  }

  return (
    <>
      <header className="relative z-50 flex h-14 items-center justify-between gap-4 bg-maroon px-4 text-surface sm:px-6">
        <div className="flex items-center gap-4">
          <button
            aria-expanded={isStudentMenuOpen}
            aria-label={isStudentMenuOpen ? "Close student menu" : "Open student menu"}
            className="flex size-8 items-center justify-center rounded hover:bg-surface/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={() => setIsStudentMenuOpen((isOpen) => !isOpen)}
            type="button"
          >
            {isStudentMenuOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
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
            {studentName && (
              <Link
                aria-label={`${studentName}, go to home`}
                className="text-surface hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                href="/home"
              >
                {studentName}
              </Link>
            )}
            <Link
              className="text-surface hover:underline"
              href="/"
              onClick={logOut}
            >
              Logout
            </Link>
          </div>
        )}
      </header>
      {isStudentMenuOpen && (
        <div className="fixed inset-0 top-14 z-40 flex">
          <button
            aria-label="Close student menu"
            className="absolute inset-0 bg-charcoal/40"
            onClick={closeStudentMenu}
            type="button"
          />
          <nav
            aria-label="Student navigation"
            className="relative h-full w-60 max-w-[85vw] border-r border-surface/15 bg-charcoal p-3 text-surface shadow-xl"
          >
            {[
              { label: "Home", href: "/home" },
              { label: "My Bookings", href: "/my-bookings" },
              { label: "Catalog", href: "/catalog" },
              { label: "Shared Machines", href: "/reserve" },
              { label: "Lab Notices", href: "/notices" },
              { label: "Help", href: "/help" },
            ].map((item) => (
              <Link
                className="mb-2 flex min-h-10 items-center rounded border border-surface/50 px-3 text-sm hover:bg-surface/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                href={item.href}
                key={item.href}
                onClick={closeStudentMenu}
              >
                {item.label}
              </Link>
            ))}
            <Link
              className="mt-4 flex min-h-10 items-center rounded border border-surface/50 px-3 text-sm hover:bg-surface/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              href="/"
              onClick={() => {
                closeStudentMenu();
                logOut();
              }}
            >
              Logout
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
