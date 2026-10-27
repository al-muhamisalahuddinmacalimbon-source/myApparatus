"use client";

import {
  Beaker,
  Cable,
  FlaskConical,
  Gauge,
  Microscope,
  Pipette,
  Plug,
  Ruler,
  Scale,
  Settings,
  Wrench,
  Zap,
} from "lucide-react";
import { useState } from "react";
import TopBar from "../../components/TopBar";
import {
  ApparatusCategory,
  mockApparatus,
} from "../../lib/mockApparatus";

const apparatusIcons = [
  FlaskConical,
  Beaker,
  Pipette,
  Gauge,
  Zap,
  Plug,
  Wrench,
  Ruler,
  Settings,
  Microscope,
  Cable,
  Scale,
];

const categories: ApparatusCategory[] = Array.from(
  new Set(mockApparatus.map((apparatus) => apparatus.category)),
);

export default function CatalogPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    ApparatusCategory | "All"
  >("All");
  const [cartCount, setCartCount] = useState(0);

  const filteredApparatus = mockApparatus.filter((apparatus) => {
    const matchesSearch = apparatus.name
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || apparatus.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <TopBar
        cartCount={cartCount}
        onSearchChange={setSearch}
        searchValue={search}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6">
        <h1 className="text-xl font-semibold text-ink">Equipment catalog</h1>
        <p className="mb-3 text-sm text-ink">
          Browse lab equipment by category and add items to your cart.
        </p>

        <div
          aria-label="Filter equipment by category"
          className="mb-3 flex flex-wrap gap-2"
          role="group"
        >
          {(["All", ...categories] as const).map((category) => (
            <button
              aria-pressed={selectedCategory === category}
              className={
                selectedCategory === category
                  ? "rounded bg-maroon px-3 py-1.5 text-sm font-semibold text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  : "rounded border border-ink/30 bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              }
              key={category}
              onClick={() => setSelectedCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>

        <section
          aria-label="Equipment"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {filteredApparatus.map((apparatus) => {
            const Icon =
              apparatusIcons[mockApparatus.indexOf(apparatus) % apparatusIcons.length];
            const isInStock = apparatus.availableStock > 0;

            return (
              <article
                className="rounded-lg border border-ink/30 border-t-[3px] border-t-gold bg-surface p-3"
                key={apparatus.id}
              >
                <div className="mb-2 flex h-20 items-center justify-center rounded-md border border-ink/30 bg-page">
                  <Icon aria-hidden="true" className="size-7 text-ink" />
                </div>
                <h2 className="font-semibold text-ink">{apparatus.name}</h2>
                <p className="text-sm text-link">{apparatus.category}</p>
                <div className="mb-2 mt-1 flex items-center justify-between gap-2 text-sm">
                  <span className="text-ink">
                    Available: {apparatus.availableStock}
                  </span>
                  {isInStock && (
                    <span className="rounded bg-success px-2 py-0.5 text-xs font-semibold text-surface">
                      In stock
                    </span>
                  )}
                </div>
                <button
                  className={
                    isInStock
                      ? "w-full rounded bg-maroon px-3 py-1.5 text-sm font-semibold text-surface hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      : "w-full cursor-not-allowed rounded border border-ink/30 bg-page px-3 py-1.5 text-sm font-semibold text-ink/60"
                  }
                  disabled={!isInStock}
                  onClick={() => setCartCount((count) => count + 1)}
                  type="button"
                >
                  {isInStock ? "Add to Cart" : "Out of Stock"}
                </button>
              </article>
            );
          })}
          {filteredApparatus.length === 0 && (
            <p className="col-span-full rounded-lg border border-ink/30 border-t-[3px] border-t-gold bg-surface p-4 text-ink">
              No equipment matches your search.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
