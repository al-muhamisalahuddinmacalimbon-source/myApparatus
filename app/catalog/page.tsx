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
import { useState, useEffect } from "react";
import TopBar from "../../components/TopBar";
import CartDrawer, { type CartItem } from "../../components/student/CartDrawer";
import BorrowerSlip from "../../components/student/BorrowerSlip";

interface Apparatus {
  id: number;
  name: string;
  category: string;
  available_stock: number;
  total_stock: number;
  status: string;
}

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

const categories = ["Glassware", "Electronics", "Tools", "Machines"] as const;

function isApparatus(value: unknown): value is Apparatus {
  if (!value || typeof value !== "object") return false;
  return (
    "id" in value &&
    typeof value.id === "number" &&
    Number.isInteger(value.id) &&
    "name" in value &&
    typeof value.name === "string" &&
    "category" in value &&
    typeof value.category === "string" &&
    "available_stock" in value &&
    typeof value.available_stock === "number" &&
    "total_stock" in value &&
    typeof value.total_stock === "number" &&
    "status" in value &&
    typeof value.status === "string"
  );
}

function isBorrowedItem(
  value: unknown,
): value is { id: number; name: string; quantity: number } {
  if (!value || typeof value !== "object") return false;
  return (
    "id" in value &&
    typeof value.id === "number" &&
    "name" in value &&
    typeof value.name === "string" &&
    "quantity" in value &&
    typeof value.quantity === "number"
  );
}

function isBorrowedItems(
  value: unknown,
): value is Array<{ id: number; name: string; quantity: number }> {
  return Array.isArray(value) && value.every(isBorrowedItem);
}

type BorrowResponse = {
  items: Array<{ id: number; name: string; quantity: number }>;
  borrowed_at: string;
  due_at: string;
};

function isBorrowResponse(value: unknown): value is BorrowResponse {
  if (!value || typeof value !== "object") return false;
  return (
    "items" in value &&
    isBorrowedItems(value.items) &&
    "borrowed_at" in value &&
    typeof value.borrowed_at === "string" &&
    "due_at" in value &&
    typeof value.due_at === "string"
  );
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  return (
    "id" in value &&
    typeof value.id === "number" &&
    "name" in value &&
    typeof value.name === "string" &&
    "quantity" in value &&
    typeof value.quantity === "number" &&
    Number.isInteger(value.quantity) &&
    value.quantity > 0 &&
    "availableStock" in value &&
    typeof value.availableStock === "number" &&
    value.quantity <= value.availableStock
  );
}

function reconcileCart(cart: CartItem[], inventory: Apparatus[]) {
  return cart.flatMap((item) => {
    const currentApparatus = inventory.find(
      (apparatus) => apparatus.id === item.id,
    );
    if (!currentApparatus) return [item];
    if (currentApparatus.available_stock <= 0) return [];

    return [
      {
        ...item,
        availableStock: currentApparatus.available_stock,
        quantity: Math.min(item.quantity, currentApparatus.available_stock),
      },
    ];
  });
}

export default function CatalogPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [cartNotice, setCartNotice] = useState("");
  const [submittedSlip, setSubmittedSlip] = useState<{
    items: CartItem[];
    submittedAt: Date;
    dueAt: Date;
  } | null>(null);
  const [student, setStudent] = useState({ id: "", name: "" });
  const [apparatusList, setApparatusList] = useState<Apparatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const savedCart = localStorage.getItem("myApparatusCart");
        if (savedCart) {
          const parsed: unknown = JSON.parse(savedCart);
          if (Array.isArray(parsed) && parsed.every(isCartItem)) {
            setCart(parsed);
          } else {
            console.error("Saved cart data has an invalid format.");
            localStorage.removeItem("myApparatusCart");
          }
        }

        const savedStudent = localStorage.getItem("student");
        if (savedStudent) {
          const parsedStudent: unknown = JSON.parse(savedStudent);
          if (
            parsedStudent &&
            typeof parsedStudent === "object" &&
            "student_id" in parsedStudent &&
            "full_name" in parsedStudent &&
            typeof parsedStudent.student_id === "string" &&
            typeof parsedStudent.full_name === "string"
          ) {
            setStudent({
              id: parsedStudent.student_id,
              name: parsedStudent.full_name,
            });
          }
        }
      } catch (error) {
        console.error("Unable to restore the saved cart or student.", error);
      } finally {
        setCartLoaded(true);
      }

    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;

    try {
      localStorage.setItem("myApparatusCart", JSON.stringify(cart));
    } catch (error) {
      console.error("Unable to save the cart in local storage.", error);
    }
  }, [cart, cartLoaded]);

  useEffect(() => {
    if (!cartNotice) return;

    const timeout = window.setTimeout(() => setCartNotice(""), 2500);
    return () => window.clearTimeout(timeout);
  }, [cartNotice]);

  // Fetch live inventory from PostgreSQL database
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (selectedCategory !== "All") params.append("category", selectedCategory);
    if (search.trim()) params.append("search", search.trim());

    fetch(`/api/apparatus/list?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!response.ok) {
          const message =
            data &&
            typeof data === "object" &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Unable to load equipment from the database.";
          throw new Error(message);
        }
        if (!Array.isArray(data) || !data.every(isApparatus)) {
          throw new Error("The equipment API returned data in an unexpected format.");
        }
        return data;
      })
      .then((data) => {
        setApparatusList(data);
        setCart((currentCart) => reconcileCart(currentCart, data));
        setCatalogError("");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Error fetching catalog from database:", error);
        setCatalogError(
          error instanceof Error
            ? error.message
            : "Unable to load equipment from the database.",
        );
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [selectedCategory, search]);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      try {
        const savedStudent = localStorage.getItem("student");
        if (!savedStudent) return;

        const parsedStudent: unknown = JSON.parse(savedStudent);
        if (
          !parsedStudent ||
          typeof parsedStudent !== "object" ||
          !("student_id" in parsedStudent) ||
          typeof parsedStudent.student_id !== "string"
        ) {
          throw new Error("Saved student information is invalid. Please sign in again.");
        }

        const response = await fetch(
          `/api/students/${encodeURIComponent(parsedStudent.student_id)}`,
        );
        const data: unknown = await response.json();
        if (!response.ok) {
          const message =
            data &&
            typeof data === "object" &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Unable to load student information from the database.";
          throw new Error(message);
        }
        if (
          !data ||
          typeof data !== "object" ||
          !("student_id" in data) ||
          typeof data.student_id !== "string" ||
          !("full_name" in data) ||
          typeof data.full_name !== "string"
        ) {
          throw new Error("The student API returned data in an unexpected format.");
        }

        setStudent({ id: data.student_id, name: data.full_name });
        localStorage.setItem("student", JSON.stringify(data));
      } catch (error) {
        console.error("Error fetching student from database:", error);
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Unable to load student information. Please sign in again.",
        );
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  function updateSearch(value: string) {
    setLoading(true);
    setSearch(value);
  }

  function addToCart(apparatus: Apparatus) {
    const existingItem = cart.find((item) => item.id === apparatus.id);
    if (existingItem && existingItem.quantity >= apparatus.available_stock) {
      setCartNotice(`Maximum available quantity for ${apparatus.name} is already in your cart.`);
      return;
    }

    setCart(
      existingItem
        ? cart.map((item) =>
            item.id === apparatus.id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  availableStock: apparatus.available_stock,
                }
              : item,
          )
        : [
            ...cart,
            {
          id: apparatus.id,
          name: apparatus.name,
          quantity: 1,
          availableStock: apparatus.available_stock,
            },
          ],
    );
    setCartNotice(`${apparatus.name} added to cart.`);
  }

  function updateQuantity(itemId: number, change: -1 | 1) {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          quantity: Math.min(item.availableStock, item.quantity + change),
        };
      }),
    );
  }

  function removeFromCart(itemId: number) {
    setCart((currentCart) => currentCart.filter((item) => item.id !== itemId));
  }

  async function submitBorrowerSlip() {
    if (!student.id) {
      setSubmitError("Student information is unavailable. Please sign in again.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/borrow/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.id,
          items: cart.map(({ id, quantity }) => ({ id, quantity })),
          due_days: 3,
        }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Unable to submit the borrowing request.";
        setSubmitError(message);
        return;
      }

      if (!isBorrowResponse(result)) {
        throw new Error("The borrow API returned an unexpected response.");
      }

      setSubmittedSlip({
        items: result.items.map((item) => ({
          ...item,
          availableStock:
            cart.find((cartItem) => cartItem.id === item.id)?.availableStock ??
            item.quantity,
        })),
        submittedAt: new Date(result.borrowed_at),
        dueAt: new Date(result.due_at),
      });
      setApparatusList((currentList) =>
        currentList.map((apparatus) => {
          const borrowedItem = result.items.find(
            (item) => item.id === apparatus.id,
          );
          return borrowedItem
            ? {
                ...apparatus,
                available_stock: Math.max(
                  0,
                  apparatus.available_stock - borrowedItem.quantity,
                ),
              }
            : apparatus;
        }),
      );
      setIsCartOpen(false);
    } catch (error) {
      console.error("Unable to submit the borrowing request.", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to submit the borrowing request. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeBorrowerSlip() {
    setSubmittedSlip(null);
    setCart([]);
  }

  return (
    <>
      <TopBar
        cartCount={cartCount}
        onCartClick={() => setIsCartOpen(true)}
        onSearchChange={updateSearch}
        searchValue={search}
      />
      {cartNotice && (
        <p
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 rounded bg-success px-4 py-3 text-sm font-semibold text-surface shadow-lg"
          role="status"
        >
          {cartNotice}
        </p>
      )}
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
              onClick={() => {
                setLoading(true);
                setSelectedCategory(category);
              }}
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
          {loading ? (
            <p className="col-span-full rounded-lg border border-ink/30 bg-surface p-4 text-ink">
              Loading equipment from the database...
            </p>
          ) : catalogError ? (
            <p className="col-span-full rounded bg-alert px-4 py-3 text-sm text-alert-text" role="alert">
              Could not load equipment: {catalogError}
            </p>
          ) : (
            apparatusList.map((apparatus, index) => {
              const Icon = apparatusIcons[index % apparatusIcons.length];
              const quantityInCart =
                submittedSlip
                  ? 0
                  : cart.find((item) => item.id === apparatus.id)?.quantity ?? 0;
              const availableToAdd = Math.max(
                0,
                apparatus.available_stock - quantityInCart,
              );
              const isInStock = availableToAdd > 0;

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
                      Available: {availableToAdd}
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
                    onClick={() => addToCart(apparatus)}
                    type="button"
                  >
                    {isInStock ? "Add to Cart" : "Out of Stock"}
                  </button>
                </article>
              );
            })
          )}

          {!loading && apparatusList.length === 0 && (
            <p className="col-span-full rounded-lg border border-ink/30 border-t-[3px] border-t-gold bg-surface p-4 text-ink">
              No equipment matches your search.
            </p>
          )}
        </section>
      </main>
      <CartDrawer
        cart={cart}
        error={submitError}
        isOpen={isCartOpen}
        isSubmitting={isSubmitting}
        onClose={() => setIsCartOpen(false)}
        onDecrease={(itemId) => updateQuantity(itemId, -1)}
        onIncrease={(itemId) => updateQuantity(itemId, 1)}
        onRemove={removeFromCart}
        onSubmit={submitBorrowerSlip}
      />
      {submittedSlip && (
        <BorrowerSlip
          dueAt={submittedSlip.dueAt}
          items={submittedSlip.items}
          onClose={closeBorrowerSlip}
          studentId={student.id}
          studentName={student.name}
          submittedAt={submittedSlip.submittedAt}
        />
      )}
    </>
  );
}