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
import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/navigation/TopBar";
import CartDrawer, { type CartItem } from "@/components/ui/CartDrawer";
import BorrowerSlip from "@/components/ui/BorrowerSlip";
import {
  findVariantAlias,
  isApparatusRecord,
  isApparatusVariant,
  withoutVariantAliases,
  type ApparatusRecord,
  type ApparatusVariant,
} from "@/types/apparatus";

type Apparatus = ApparatusRecord;

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

const categories = [
  "Glassware",
  "Electronics",
  "Tools",
  "Safety",
] as const;

type BorrowedItemResponse = {
  id: number;
  variant_id: number | null;
  name: string;
  quantity: number;
};

function isBorrowedItem(value: unknown): value is BorrowedItemResponse {
  if (!value || typeof value !== "object") return false;
  return (
    "id" in value &&
    typeof value.id === "number" &&
    "variant_id" in value &&
    (typeof value.variant_id === "number" || value.variant_id === null) &&
    "name" in value &&
    typeof value.name === "string" &&
    "quantity" in value &&
    typeof value.quantity === "number"
  );
}

function isBorrowedItems(
  value: unknown,
): value is BorrowedItemResponse[] {
  return Array.isArray(value) && value.every(isBorrowedItem);
}

type BorrowResponse = {
  loan_id: number;
  endorsement_token: string;
  items: BorrowedItemResponse[];
  borrowed_at: string;
  due_at: string;
  remarks: string | null;
  mock_fallback?: boolean;
};

function isBorrowResponse(value: unknown): value is BorrowResponse {
  if (!value || typeof value !== "object") return false;
  return (
    "loan_id" in value &&
    typeof value.loan_id === "number" &&
    "endorsement_token" in value &&
    typeof value.endorsement_token === "string" &&
    "items" in value &&
    isBorrowedItems(value.items) &&
    "borrowed_at" in value &&
    typeof value.borrowed_at === "string" &&
    "due_at" in value &&
    typeof value.due_at === "string" &&
    "remarks" in value &&
      (typeof value.remarks === "string" || value.remarks === null) &&
      (!("mock_fallback" in value) || typeof value.mock_fallback === "boolean")
  );
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  return (
    "key" in value &&
    typeof value.key === "string" &&
    "apparatusId" in value &&
    typeof value.apparatusId === "number" &&
    "variantId" in value &&
    (typeof value.variantId === "number" || value.variantId === null) &&
    "parentName" in value &&
    typeof value.parentName === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "quantity" in value &&
    typeof value.quantity === "number" &&
    Number.isInteger(value.quantity) &&
    value.quantity > 0 &&
    "availableStock" in value &&
    typeof value.availableStock === "number" &&
    value.quantity <= value.availableStock &&
    "variants" in value &&
    Array.isArray(value.variants) &&
    value.variants.every(isApparatusVariant)
  );
}

function isLegacyCartItem(
  value: unknown,
): value is { id: number; name: string; quantity: number; availableStock: number } {
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
    let currentApparatus = inventory.find(
      (apparatus) => apparatus.id === item.apparatusId,
    );
    if (!currentApparatus) return [item];

    let variant =
      item.variantId === null
        ? undefined
        : currentApparatus.variants.find(
            (candidate) => candidate.id === item.variantId,
          );
    const alias = findVariantAlias(currentApparatus, inventory);
    if (alias) {
      currentApparatus = alias.parent;
      variant = alias.variant;
    } else if (currentApparatus.variants.length > 0 && !variant) {
      variant = currentApparatus.variants.find(
        (candidate) => candidate.status === "Active",
      );
    }

    const availableStock = variant?.available_stock ??
      currentApparatus.available_stock;
    if (
      availableStock <= 0 ||
      variant?.status === "Inactive" ||
      currentApparatus.status === "Inactive"
    ) {
      return [];
    }

    return [
      {
        ...item,
        key: variant ? `variant:${variant.id}` : `apparatus:${currentApparatus.id}`,
        apparatusId: currentApparatus.id,
        variantId: variant?.id ?? null,
        parentName: currentApparatus.name,
        name: variant
          ? `${currentApparatus.name} (${variant.name})`
          : currentApparatus.name,
        availableStock,
        variants: currentApparatus.variants,
        quantity: Math.min(item.quantity, availableStock),
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
  const [subjectName, setSubjectName] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [cartNotice, setCartNotice] = useState("");
  const [submittedSlip, setSubmittedSlip] = useState<{
    items: CartItem[];
    submittedAt: Date;
    dueAt: Date;
    remarks: string | null;
    endorsementToken: string;
    subjectName: string;
    instructorName: string;
    mockFallback: boolean;
  } | null>(null);
  const [student, setStudent] = useState({ id: "", name: "" });
  const [apparatusList, setApparatusList] = useState<Apparatus[]>([]);
  const [selectedVariantIds, setSelectedVariantIds] = useState<
    Record<number, number>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const savedCart = localStorage.getItem("myApparatusCart");
        if (savedCart) {
          const parsed: unknown = JSON.parse(savedCart);
          if (Array.isArray(parsed) && parsed.every(isCartItem)) {
            setCart(parsed);
          } else if (Array.isArray(parsed) && parsed.every(isLegacyCartItem)) {
            setCart(
              parsed.map((item) => ({
                key: `apparatus:${item.id}`,
                apparatusId: item.id,
                variantId: null,
                parentName: item.name,
                name: item.name,
                quantity: item.quantity,
                availableStock: item.availableStock,
                variants: [],
              })),
            );
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

  const loadCatalog = useCallback(async (signal: AbortSignal) => {
    const params = new URLSearchParams();
    if (selectedCategory !== "All") params.append("category", selectedCategory);
    if (search.trim()) params.append("search", search.trim());

    try {
      const response = await fetch(`/api/apparatus/list?${params.toString()}`, {
        cache: "no-store",
        signal,
      });
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
      if (!Array.isArray(data) || !data.every(isApparatusRecord)) {
        throw new Error("The equipment API returned data in an unexpected format.");
      }
      const apparatusOnly = data.filter(
        (apparatus) => apparatus.category !== "Machines",
      );
      setApparatusList(withoutVariantAliases(apparatusOnly));
      setCart((currentCart) => reconcileCart(currentCart, apparatusOnly));
      setCatalogError("");
    } catch (error) {
      if (signal.aborted) return;
      console.error("Error fetching catalog from database:", error);
      setCatalogError(
        error instanceof Error
          ? error.message
          : "Unable to load equipment from the database.",
      );
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = window.setTimeout(
      () => void loadCatalog(controller.signal),
      0,
    );
    const refresh = () => {
      if (document.visibilityState === "visible") {
        void loadCatalog(controller.signal);
      }
    };
    const interval = window.setInterval(() => {
      void loadCatalog(controller.signal);
    }, 15_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      controller.abort();
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadCatalog]);

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

  function selectedVariantFor(apparatus: Apparatus) {
    return (
      apparatus.variants.find(
        (variant) => variant.id === selectedVariantIds[apparatus.id],
      ) ??
      apparatus.variants.find((variant) => variant.status === "Active") ??
      apparatus.variants[0]
    );
  }

  function updateSearch(value: string) {
    setLoading(true);
    setSearch(value);
  }

  function addToCart(apparatus: Apparatus, variant?: ApparatusVariant) {
    const key = variant ? `variant:${variant.id}` : `apparatus:${apparatus.id}`;
    const availableStock = variant?.available_stock ?? apparatus.available_stock;
    const name = variant
      ? `${apparatus.name} (${variant.name})`
      : apparatus.name;
    const existingItem = cart.find((item) => item.key === key);
    if (
      apparatus.status !== "Active" ||
      variant?.status === "Inactive" ||
      availableStock <= 0
    ) {
      setCartNotice(`${name} is currently unavailable.`);
      return;
    }
    if (existingItem && existingItem.quantity >= availableStock) {
      setCartNotice(`Maximum available quantity for ${name} is already in your cart.`);
      return;
    }

    setCart(
      existingItem
        ? cart.map((item) =>
            item.key === key
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  availableStock,
                  variants: apparatus.variants,
                }
              : item,
          )
        : [
            ...cart,
            {
              key,
              apparatusId: apparatus.id,
              variantId: variant?.id ?? null,
              parentName: apparatus.name,
              name,
              quantity: 1,
              availableStock,
              variants: apparatus.variants,
            },
          ],
    );
    setCartNotice(`${name} added to cart.`);
  }

  function updateQuantity(itemKey: string, change: -1 | 1) {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.key !== itemKey) return item;
        return {
          ...item,
          quantity: Math.min(item.availableStock, item.quantity + change),
        };
      }),
    );
  }

  function removeFromCart(itemKey: string) {
    setCart((currentCart) => currentCart.filter((item) => item.key !== itemKey));
  }

  function changeCartVariant(itemKey: string, variantId: number) {
    const item = cart.find((candidate) => candidate.key === itemKey);
    const apparatus = item
      ? apparatusList.find((candidate) => candidate.id === item.apparatusId)
      : undefined;
    const targetVariant = apparatus?.variants.find(
      (variant) => variant.id === variantId,
    );
    if (!item || !apparatus || !targetVariant) return;
    if (targetVariant.status !== "Active" || targetVariant.available_stock <= 0) {
      setCartNotice(`${targetVariant.name} is currently unavailable.`);
      return;
    }

    const targetKey = `variant:${targetVariant.id}`;
    const existingTarget = cart.find(
      (candidate) => candidate.key === targetKey,
    );
    const combinedQuantity =
      item.quantity + (existingTarget?.quantity ?? 0);
    const quantity = Math.min(combinedQuantity, targetVariant.available_stock);
    setCart((currentCart) => [
      ...currentCart.filter(
        (candidate) =>
          candidate.key !== itemKey && candidate.key !== targetKey,
      ),
      {
        ...item,
        key: targetKey,
        apparatusId: apparatus.id,
        variantId: targetVariant.id,
        parentName: apparatus.name,
        name: `${apparatus.name} (${targetVariant.name})`,
        quantity,
        availableStock: targetVariant.available_stock,
        variants: apparatus.variants,
      },
    ]);
    setSelectedVariantIds((current) => ({
      ...current,
      [apparatus.id]: targetVariant.id,
    }));
    if (quantity < combinedQuantity) {
      setCartNotice(
        `Quantity adjusted to this variant's ${targetVariant.available_stock} available units.`,
      );
    }
  }

  async function submitBorrowerSlip() {
    if (!student.id) {
      setSubmitError("Student information is unavailable. Please sign in again.");
      return;
    }
    if (!subjectName.trim() || !instructorName.trim()) {
      setSubmitError("Enter the subject and instructor name before submitting.");
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
          student_name: student.name,
          subject_name: subjectName.trim(),
          instructor_name: instructorName.trim(),
          instructor_endorsed: false,
          items: cart.map((item) =>
            item.variantId === null
              ? { id: item.apparatusId, name: item.name, quantity: item.quantity }
              : { variant_id: item.variantId, name: item.name, quantity: item.quantity },
          ),
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
        items: result.items.map((item) => {
          const cartItem = cart.find(
            (candidate) =>
              candidate.apparatusId === item.id &&
              candidate.variantId === item.variant_id,
          );
          return {
            key: cartItem?.key ?? `borrowed:${item.id}:${item.variant_id ?? "parent"}`,
            apparatusId: item.id,
            variantId: item.variant_id,
            parentName: cartItem?.parentName ?? item.name,
            name: item.name,
            quantity: item.quantity,
            availableStock: cartItem?.availableStock ?? item.quantity,
            variants: cartItem?.variants ?? [],
          };
        }),
        submittedAt: new Date(result.borrowed_at),
        dueAt: new Date(result.due_at),
        remarks: result.remarks,
        endorsementToken: result.endorsement_token,
        subjectName: subjectName.trim(),
        instructorName: instructorName.trim(),
        mockFallback: result.mock_fallback === true,
      });
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
              const selectedVariant = selectedVariantFor(apparatus);
              const stockOwner =
                apparatus.variants.length > 0
                  ? selectedVariant
                  : undefined;
              const totalStock =
                stockOwner?.total_stock ?? apparatus.total_stock;
              const availableStock =
                stockOwner?.available_stock ?? apparatus.available_stock;
              const itemKey = stockOwner
                ? `variant:${stockOwner.id}`
                : `apparatus:${apparatus.id}`;
              const quantityInCart =
                submittedSlip
                  ? 0
                  : cart.find((item) => item.key === itemKey)?.quantity ?? 0;
              const availableToAdd = Math.max(
                0,
                availableStock - quantityInCart,
              );
              const isInStock =
                availableToAdd > 0 &&
                apparatus.status === "Active" &&
                stockOwner?.status !== "Inactive";

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
                  {apparatus.variants.length > 0 && (
                    <label className="mt-2 block text-sm font-medium text-ink">
                      Size / material
                      <select
                        className="mt-1 min-h-10 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        onChange={(event) =>
                          setSelectedVariantIds((current) => ({
                            ...current,
                            [apparatus.id]: Number(event.target.value),
                          }))
                        }
                        value={selectedVariant?.id ?? ""}
                      >
                        {apparatus.variants.map((variant) => (
                          <option
                            disabled={variant.status !== "Active"}
                            key={variant.id}
                            value={variant.id}
                          >
                            {variant.name}
                            {variant.status !== "Active" ? " (Inactive)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="mb-2 mt-1 flex items-center justify-between gap-2 text-sm">
                    <span className="text-ink">In Stock: {totalStock}</span>
                    <span className="rounded bg-success px-2 py-0.5 text-xs font-semibold text-surface">
                      {stockOwner?.status ?? apparatus.status}
                    </span>
                  </div>
                  <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                    <span className="text-ink">
                      Available: {availableStock}
                    </span>
                    {quantityInCart > 0 && (
                      <span className="text-ink/70">In cart: {quantityInCart}</span>
                    )}
                  </div>
                  <button
                    className={
                      isInStock
                        ? "w-full rounded bg-maroon px-3 py-1.5 text-sm font-semibold text-surface hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        : "w-full cursor-not-allowed rounded border border-ink/30 bg-page px-3 py-1.5 text-sm font-semibold text-ink/60"
                    }
                    disabled={!isInStock}
                    onClick={() => addToCart(apparatus, stockOwner)}
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
        subjectName={subjectName}
        instructorName={instructorName}
        onClose={() => setIsCartOpen(false)}
        onDecrease={(itemId) => updateQuantity(itemId, -1)}
        onIncrease={(itemId) => updateQuantity(itemId, 1)}
        onRemove={removeFromCart}
        onVariantChange={changeCartVariant}
        onSubjectNameChange={setSubjectName}
        onInstructorNameChange={setInstructorName}
        onSubmit={submitBorrowerSlip}
      />
      {submittedSlip && (
        <BorrowerSlip
          dueAt={submittedSlip.dueAt}
          items={submittedSlip.items}
          onClose={closeBorrowerSlip}
          remarks={submittedSlip.remarks}
          endorsementToken={submittedSlip.endorsementToken}
          subjectName={submittedSlip.subjectName}
          instructorName={submittedSlip.instructorName}
          mockFallback={submittedSlip.mockFallback}
          studentId={student.id}
          studentName={student.name}
          submittedAt={submittedSlip.submittedAt}
        />
      )}
    </>
  );
}