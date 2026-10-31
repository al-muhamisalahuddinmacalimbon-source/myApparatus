"use client";

import {
  Beaker,
  Cable,
  CircleHelp,
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
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import StaffShell from "../../../components/StaffShell";
import type { ApparatusCategory } from "../../../lib/mockApparatus";

type CatalogItem = {
  id: number;
  name: string;
  category: ApparatusCategory;
  totalStock: number;
  availableStock: number;
  status: "Active" | "Inactive";
  icon: string;
};

type ApparatusForm = {
  name: string;
  category: ApparatusCategory;
  totalStock: string;
  availableStock: string;
  status: "Active" | "Inactive";
  icon: string;
};

const categories: ApparatusCategory[] = [
  "Glassware",
  "Electronics",
  "Tools",
  "Machines",
  "Safety",
];

const iconOptions: Array<{ name: string; Icon: LucideIcon }> = [
  { name: "flask-conical", Icon: FlaskConical },
  { name: "beaker", Icon: Beaker },
  { name: "pipette", Icon: Pipette },
  { name: "gauge", Icon: Gauge },
  { name: "zap", Icon: Zap },
  { name: "plug", Icon: Plug },
  { name: "wrench", Icon: Wrench },
  { name: "ruler", Icon: Ruler },
  { name: "settings", Icon: Settings },
  { name: "microscope", Icon: Microscope },
  { name: "cable", Icon: Cable },
  { name: "scale", Icon: Scale },
  { name: "help", Icon: CircleHelp },
];

const emptyForm: ApparatusForm = {
  name: "",
  category: "Glassware",
  totalStock: "",
  availableStock: "",
  status: "Active",
  icon: iconOptions[0].name,
};

function isApparatusRecord(value: unknown): value is {
  id: number;
  name: string;
  category: ApparatusCategory;
  total_stock: number;
  available_stock: number;
  status: "Active" | "Inactive";
  icon: string;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "name" in value &&
    typeof value.name === "string" &&
    "category" in value &&
    typeof value.category === "string" &&
    categories.some((category) => category === value.category) &&
    "total_stock" in value &&
    typeof value.total_stock === "number" &&
    "available_stock" in value &&
    typeof value.available_stock === "number" &&
    "status" in value &&
    (value.status === "Active" || value.status === "Inactive") &&
    "icon" in value &&
    typeof value.icon === "string"
  );
}

function fromDatabaseRecord(record: {
  id: number;
  name: string;
  category: ApparatusCategory;
  total_stock: number;
  available_stock: number;
  status: "Active" | "Inactive";
  icon: string;
}): CatalogItem {
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    totalStock: record.total_stock,
    availableStock: record.available_stock,
    status: record.status,
    icon: record.icon,
  };
}

function getIcon(name: string) {
  return iconOptions.find((option) => option.name === name)?.Icon ?? CircleHelp;
}

export default function StaffCatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const [form, setForm] = useState<ApparatusForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadApparatus() {
      try {
        const response = await fetch("/api/admin/apparatus", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            result &&
              typeof result === "object" &&
              "error" in result &&
              typeof result.error === "string"
              ? result.error
              : "Unable to load apparatus from the database.",
          );
        }
        if (!Array.isArray(result) || !result.every(isApparatusRecord)) {
          throw new Error("The apparatus API returned data in an unexpected format.");
        }
        setItems(result.map(fromDatabaseRecord));
        setError("");
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error("Unable to load staff apparatus catalog:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load apparatus from the database.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadApparatus();
    const interval = window.setInterval(() => void loadApparatus(), 15_000);
    const refresh = () => {
      if (document.visibilityState === "visible") void loadApparatus();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.name.toLocaleLowerCase().includes(query) ||
        item.category.toLocaleLowerCase().includes(query),
    );
  }, [items, search]);

  function openAddWindow() {
    setEditingId(null);
    setIsWindowOpen(true);
    setForm(emptyForm);
    setError("");
    setNotice("");
  }

  function openEditWindow(item: CatalogItem) {
    setEditingId(item.id);
    setIsWindowOpen(true);
    const savedIcon = iconOptions.some((option) => option.name === item.icon)
      ? item.icon
      : iconOptions[0].name;
    setForm({
      name: item.name,
      category: item.category,
      totalStock: String(item.totalStock),
      availableStock: String(item.availableStock),
      status: item.status,
      icon: savedIcon,
    });
    setError("");
    setNotice("");
  }

  function closeWindow() {
    setIsWindowOpen(false);
    setEditingId(null);
    setError("");
  }

  async function saveApparatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const totalStock = Number(form.totalStock);
    const availableStock = Number(form.availableStock);
    if (
      !name ||
      !Number.isInteger(totalStock) ||
      totalStock < 0 ||
      !Number.isInteger(availableStock) ||
      availableStock < 0 ||
      availableStock > totalStock
    ) {
      setError("Enter a name and valid stock counts. Available stock cannot exceed total stock.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        editingId
          ? `/api/admin/apparatus/${editingId}`
          : "/api/admin/apparatus",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            category: form.category,
            total_stock: totalStock,
            available_stock: availableStock,
            status: form.status,
            icon: form.icon,
          }),
        },
      );
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          result &&
            typeof result === "object" &&
            "error" in result &&
            typeof result.error === "string"
            ? result.error
            : "Unable to save apparatus.",
        );
      }
      if (!isApparatusRecord(result)) {
        throw new Error("The apparatus API returned data in an unexpected format.");
      }
      const savedItem = fromDatabaseRecord(result);
      setItems((current) =>
        editingId
          ? current.map((item) => (item.id === editingId ? savedItem : item))
          : [...current, savedItem],
      );
      setNotice(editingId ? "Apparatus updated." : "Apparatus added.");
      setIsWindowOpen(false);
      setEditingId(null);
    } catch (saveError) {
      console.error("Unable to save apparatus:", saveError);
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save apparatus.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function setApparatusStatus(item: CatalogItem) {
    setProcessingId(item.id);
    setError("");
    setNotice("");
    const nextStatus = item.status === "Active" ? "Inactive" : "Active";
    try {
      const response = await fetch(`/api/admin/apparatus/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          category: item.category,
          total_stock: item.totalStock,
          available_stock: item.availableStock,
          status: nextStatus,
          icon: item.icon,
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          result &&
            typeof result === "object" &&
            "error" in result &&
            typeof result.error === "string"
            ? result.error
            : "Unable to update apparatus status.",
        );
      }
      if (!isApparatusRecord(result)) {
        throw new Error("The apparatus API returned data in an unexpected format.");
      }
      const savedItem = fromDatabaseRecord(result);
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id ? savedItem : currentItem,
        ),
      );
      setNotice(
        `${item.name} ${nextStatus === "Inactive" ? "archived" : "activated"}.`,
      );
    } catch (statusError) {
      console.error("Unable to update apparatus status:", statusError);
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Unable to update apparatus status.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <StaffShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink">Manage apparatus</h1>
        <button
          className="min-h-10 rounded-md bg-maroon px-4 py-2 text-sm font-semibold text-surface hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={openAddWindow}
          type="button"
        >
          Add Apparatus
        </button>
      </div>

      <label className="mb-4 block max-w-sm">
        <span className="sr-only">Search apparatus</span>
        <input
          className="min-h-10 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search apparatus"
          type="search"
          value={search}
        />
      </label>

      {error && (
        <p className="mb-3 rounded bg-alert px-3 py-2 text-sm text-alert-text" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="mb-3 rounded bg-success px-3 py-2 text-sm text-surface" role="status">
          {notice}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-ink/30 border-t-[3px] border-t-accent bg-surface">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm text-ink">
          <thead className="bg-page">
            <tr>
              <th className="px-3 py-3 font-semibold" scope="col">Name</th>
              <th className="px-3 py-3 font-semibold" scope="col">Category</th>
              <th className="px-3 py-3 font-semibold" scope="col">Total stock</th>
              <th className="px-3 py-3 font-semibold" scope="col">Available</th>
              <th className="px-3 py-3 font-semibold" scope="col">Status</th>
              <th className="px-3 py-3 font-semibold" scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-8 text-center text-ink/70" colSpan={6}>
                  Loading apparatus from the database...
                </td>
              </tr>
            ) : filteredItems.map((item) => {
              const Icon = getIcon(item.icon);
              const inactive = item.status === "Inactive";
              return (
                <tr
                  className={`border-t border-ink/15 ${
                    inactive ? "bg-page text-ink/60" : ""
                  }`}
                  key={item.id}
                >
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2">
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      {item.name}
                    </span>
                  </td>
                  <td className="px-3 py-3">{item.category}</td>
                  <td className="px-3 py-3">{item.totalStock}</td>
                  <td className="px-3 py-3">{item.availableStock}</td>
                  <td className="px-3 py-3">
                    <span
                      className={
                        inactive
                          ? "rounded-full bg-ink/10 px-2 py-1 text-xs font-semibold text-ink/70"
                          : "rounded-full bg-success/10 px-2 py-1 text-xs font-semibold text-success"
                      }
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="min-h-9 rounded-md border border-ink/40 bg-surface px-3 py-1 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        disabled={processingId === item.id}
                        onClick={() => openEditWindow(item)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="min-h-9 rounded-md border border-ink/40 bg-surface px-3 py-1 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={processingId === item.id}
                        onClick={() => void setApparatusStatus(item)}
                        type="button"
                      >
                        {processingId === item.id
                          ? "Saving..."
                          : inactive
                            ? "Activate"
                            : "Archive"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && filteredItems.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-ink/70" colSpan={6}>
                  No apparatus found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isWindowOpen ? (
        <div
          aria-labelledby="apparatus-window-heading"
          aria-modal="true"
          className="fixed inset-0 z-30 flex items-center justify-center bg-charcoal/60 p-4"
          role="dialog"
        >
          <form
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-ink/20 border-t-[3px] border-t-accent bg-surface p-5"
            onSubmit={saveApparatus}
          >
            <h2
              className="mb-4 text-lg font-semibold text-ink"
              id="apparatus-window-heading"
            >
              {editingId ? "Edit Apparatus" : "Add Apparatus"}
            </h2>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-ink">
                Name
                <input
                  autoFocus
                  className="mt-1 min-h-10 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  maxLength={120}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                  value={form.name}
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Category
                <select
                  className="mt-1 min-h-10 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  onChange={(event) =>
                    setForm((current) => {
                      const category = categories.find(
                        (option) => option === event.target.value,
                      );
                      return category ? { ...current, category } : current;
                    })
                  }
                  value={form.category}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-ink">
                Total stock
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  min="0"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      totalStock: event.target.value,
                    }))
                  }
                  required
                  type="number"
                  value={form.totalStock}
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Available stock
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  max={form.totalStock || undefined}
                  min="0"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      availableStock: event.target.value,
                    }))
                  }
                  required
                  type="number"
                  value={form.availableStock}
                />
              </label>
              {editingId !== null && (
                <label className="block text-sm font-medium text-ink">
                  Status
                  <select
                    className="mt-1 min-h-10 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status:
                          event.target.value === "Inactive" ? "Inactive" : "Active",
                      }))
                    }
                    value={form.status}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
              )}
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-ink">
                  Choose an icon
                </legend>
                <div className="grid grid-cols-6 gap-2">
                  {iconOptions.map(({ name, Icon }) => (
                    <button
                      aria-label={name}
                      aria-pressed={form.icon === name}
                      className={`flex size-10 items-center justify-center rounded-md border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        form.icon === name
                          ? "border-maroon bg-maroon text-surface"
                          : "border-ink/30 bg-surface text-ink hover:bg-page"
                      }`}
                      key={name}
                      onClick={() =>
                        setForm((current) => ({ ...current, icon: name }))
                      }
                      type="button"
                    >
                      <Icon aria-hidden="true" className="size-5" />
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            {error && (
              <p className="mt-4 rounded bg-alert px-3 py-2 text-sm text-alert-text" role="alert">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="min-h-10 rounded-md border border-ink/40 bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                disabled={saving}
                onClick={closeWindow}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-10 rounded-md bg-maroon px-4 py-2 text-sm font-semibold text-surface hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                disabled={saving}
                type="submit"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Add Apparatus"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </StaffShell>
  );
}
