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
import StaffShell from "@/components/navigation/StaffShell";
import type { CatalogMachine, MachineStatus } from "@/types/machine";
import type { ApparatusCategory } from "@/types/reservation";

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

type MachineForm = {
  name: string;
  model: string;
  specifications: string;
  status: MachineStatus;
  notes: string;
};

const categories: ApparatusCategory[] = [
  "Glassware",
  "Electronics",
  "Tools",
  "Machines",
  "Safety",
];

const machineStatuses: MachineStatus[] = [
  "available",
  "in_use",
  "maintenance",
  "archived",
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

const emptyMachineForm: MachineForm = {
  name: "",
  model: "",
  specifications: "",
  status: "available",
  notes: "",
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

function isCatalogMachine(value: unknown): value is CatalogMachine {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "name" in value &&
    typeof value.name === "string" &&
    "model" in value &&
    (typeof value.model === "string" || value.model === null) &&
    "specifications" in value &&
    (typeof value.specifications === "string" || value.specifications === null) &&
    "status" in value &&
    typeof value.status === "string" &&
    machineStatuses.some((status) => status === value.status) &&
    "notes" in value &&
    (typeof value.notes === "string" || value.notes === null) &&
    "created_at" in value &&
    typeof value.created_at === "string" &&
    "updated_at" in value &&
    typeof value.updated_at === "string"
  );
}

function getIcon(name: string) {
  return iconOptions.find((option) => option.name === name)?.Icon ?? CircleHelp;
}

function formatMachineStatus(status: MachineStatus) {
  const label = status.replace("_", " ");
  return label.charAt(0).toLocaleUpperCase() + label.slice(1);
}

export default function StaffCatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [machines, setMachines] = useState<CatalogMachine[]>([]);
  const [catalogType, setCatalogType] = useState<"apparatus" | "machines">(
    "apparatus",
  );
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ApparatusCategory | "All Types">(
    "All Types",
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const [form, setForm] = useState<ApparatusForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [machineError, setMachineError] = useState("");
  const [machineFormError, setMachineFormError] = useState("");
  const [machinesLoading, setMachinesLoading] = useState(true);
  const [machineSaving, setMachineSaving] = useState(false);
  const [machineProcessingId, setMachineProcessingId] = useState<number | null>(
    null,
  );
  const [editingMachineId, setEditingMachineId] = useState<number | null>(null);
  const [isMachineWindowOpen, setIsMachineWindowOpen] = useState(false);
  const [machineForm, setMachineForm] = useState<MachineForm>(emptyMachineForm);
  const [showArchived, setShowArchived] = useState(false);

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

    async function loadMachines() {
      try {
        const response = await fetch("/api/admin/machines", {
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
              : "Unable to load machines from the database.",
          );
        }
        if (!Array.isArray(result) || !result.every(isCatalogMachine)) {
          throw new Error("The machine API returned data in an unexpected format.");
        }
        setMachines(result);
        setMachineError("");
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error("Unable to load catalog machines:", loadError);
        setMachineError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load machines from the database.",
        );
      } finally {
        if (!controller.signal.aborted) setMachinesLoading(false);
      }
    }

    void loadApparatus();
    void loadMachines();
    const interval = window.setInterval(() => {
      void loadApparatus();
      void loadMachines();
    }, 15_000);
    const refresh = () => {
      if (document.visibilityState === "visible") {
        void loadApparatus();
        void loadMachines();
      }
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
    return items.filter(
      (item) => {
        const matchesCategory =
          selectedCategory === "All Types" || item.category === selectedCategory;
        const matchesSearch =
          !query ||
          item.name.toLocaleLowerCase().includes(query) ||
          item.category.toLocaleLowerCase().includes(query);
        return matchesCategory && matchesSearch;
      },
    );
  }, [items, search, selectedCategory]);

  const itemCategories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category))),
    [items],
  );

  const filteredMachines = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return machines.filter((machine) => {
      if (!showArchived && machine.status === "archived") return false;
      return (
        !query ||
        machine.name.toLocaleLowerCase().includes(query) ||
        (machine.model ?? "").toLocaleLowerCase().includes(query) ||
        (machine.specifications ?? "").toLocaleLowerCase().includes(query) ||
        (machine.notes ?? "").toLocaleLowerCase().includes(query) ||
        machine.status.replace("_", " ").toLocaleLowerCase().includes(query)
      );
    });
  }, [machines, search, showArchived]);

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

  function openAddMachineWindow() {
    setEditingMachineId(null);
    setIsMachineWindowOpen(true);
    setMachineForm(emptyMachineForm);
    setMachineFormError("");
    setMachineError("");
    setNotice("");
  }

  function openEditMachineWindow(machine: CatalogMachine) {
    setEditingMachineId(machine.id);
    setIsMachineWindowOpen(true);
    setMachineForm({
      name: machine.name,
      model: machine.model ?? "",
      specifications: machine.specifications ?? "",
      status: machine.status,
      notes: machine.notes ?? "",
    });
    setMachineFormError("");
    setMachineError("");
    setNotice("");
  }

  function closeMachineWindow() {
    setIsMachineWindowOpen(false);
    setEditingMachineId(null);
    setMachineFormError("");
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

  async function saveMachine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = machineForm.name.trim();
    if (!name) {
      setMachineFormError("Enter a machine name.");
      return;
    }

    setMachineSaving(true);
    setMachineFormError("");
    setMachineError("");
    setNotice("");
    try {
      const response = await fetch(
        editingMachineId
          ? `/api/admin/machines/${editingMachineId}`
          : "/api/admin/machines",
        {
          method: editingMachineId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            model: machineForm.model.trim() || null,
            specifications: machineForm.specifications.trim() || null,
            status: machineForm.status,
            notes: machineForm.notes.trim() || null,
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
            : "Unable to save machine.",
        );
      }
      if (!isCatalogMachine(result)) {
        throw new Error("The machine API returned data in an unexpected format.");
      }

      setMachines((current) =>
        editingMachineId
          ? current.map((machine) =>
              machine.id === editingMachineId ? result : machine,
            )
          : [...current, result],
      );
      setNotice(editingMachineId ? "Machine updated." : "Machine added.");
      closeMachineWindow();
    } catch (saveError) {
      console.error("Unable to save catalog machine:", saveError);
      setMachineFormError(
        saveError instanceof Error ? saveError.message : "Unable to save machine.",
      );
    } finally {
      setMachineSaving(false);
    }
  }

  async function toggleMachineArchive(machine: CatalogMachine) {
    const nextStatus: MachineStatus =
      machine.status === "archived" ? "available" : "archived";
    setMachineProcessingId(machine.id);
    setMachineError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/machines/${machine.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          result &&
            typeof result === "object" &&
            "error" in result &&
            typeof result.error === "string"
            ? result.error
            : "Unable to update machine status.",
        );
      }
      if (!isCatalogMachine(result)) {
        throw new Error("The machine API returned data in an unexpected format.");
      }
      setMachines((current) =>
        current.map((currentMachine) =>
          currentMachine.id === machine.id ? result : currentMachine,
        ),
      );
      setNotice(
        `${machine.name} ${nextStatus === "archived" ? "archived" : "restored"}.`,
      );
    } catch (statusError) {
      console.error("Unable to update machine status:", statusError);
      setMachineError(
        statusError instanceof Error
          ? statusError.message
          : "Unable to update machine status.",
      );
    } finally {
      setMachineProcessingId(null);
    }
  }

  return (
    <StaffShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink">Manage catalog</h1>
        <button
          className="min-h-10 rounded-md bg-maroon px-4 py-2 text-sm font-semibold text-surface hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={
            catalogType === "apparatus"
              ? openAddWindow
              : openAddMachineWindow
          }
          type="button"
        >
          Add {catalogType === "apparatus" ? "Apparatus" : "Machine"}
        </button>
      </div>

      <div
        aria-label="Catalog item type"
        className="mb-4 flex flex-wrap gap-2"
        role="group"
      >
        {(["apparatus", "machines"] as const).map((type) => (
          <button
            aria-pressed={catalogType === type}
            className={
              catalogType === type
                ? "min-h-10 rounded-md bg-maroon px-4 py-2 text-sm font-semibold text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                : "min-h-10 rounded-md border border-ink/30 bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            }
            key={type}
            onClick={() => {
              setCatalogType(type);
              setSearch("");
            }}
            type="button"
          >
            {type === "apparatus" ? "Apparatus" : "Machines"}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block w-full max-w-sm">
          <span className="sr-only">
            Search {catalogType === "apparatus" ? "apparatus" : "machines"}
          </span>
          <input
            className="min-h-10 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${catalogType === "apparatus" ? "apparatus" : "machines"}`}
            type="search"
            value={search}
          />
        </label>
        {catalogType === "apparatus" ? (
          <label className="block w-full max-w-xs">
            <span className="sr-only">Filter by apparatus type</span>
            <select
              className="min-h-10 w-full rounded-md border border-maroon/40 bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onChange={(event) => {
                const value = event.target.value;
                const category = itemCategories.find(
                  (itemCategory) => itemCategory === value,
                );
                setSelectedCategory(
                  value === "All Types" ? "All Types" : category ?? "All Types",
                );
              }}
              value={selectedCategory}
            >
              <option value="All Types">All Types</option>
              {itemCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="flex min-h-10 items-center gap-2 rounded-md border border-maroon/40 bg-surface px-3 py-2 text-sm font-medium text-ink">
            <input
              checked={showArchived}
              className="size-4 accent-maroon focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onChange={(event) => setShowArchived(event.target.checked)}
              type="checkbox"
            />
            Show archived
          </label>
        )}
      </div>

      {(catalogType === "apparatus" ? error : machineError) && (
        <p className="mb-3 rounded bg-alert px-3 py-2 text-sm text-alert-text" role="alert">
          {catalogType === "apparatus" ? error : machineError}
        </p>
      )}
      {notice && (
        <p className="mb-3 rounded bg-success px-3 py-2 text-sm text-surface" role="status">
          {notice}
        </p>
      )}

      {catalogType === "apparatus" ? (
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
      ) : (
        <div className="overflow-x-auto rounded-lg border border-ink/30 border-t-[3px] border-t-gold bg-surface">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm text-ink">
            <thead className="bg-page">
              <tr>
                <th className="px-3 py-3 font-semibold" scope="col">Machine</th>
                <th className="px-3 py-3 font-semibold" scope="col">Model and specifications</th>
                <th className="px-3 py-3 font-semibold" scope="col">Status</th>
                <th className="px-3 py-3 font-semibold" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {machinesLoading ? (
                <tr>
                  <td className="px-3 py-8 text-center text-ink/70" colSpan={4}>
                    Loading machines from the database...
                  </td>
                </tr>
              ) : filteredMachines.map((machine) => {
                const archived = machine.status === "archived";
                return (
                  <tr
                    className={`border-t border-ink/15 ${
                      archived ? "bg-page text-ink/60" : ""
                    }`}
                    key={machine.id}
                  >
                    <td className="px-3 py-3 align-top font-semibold">
                      {machine.name}
                      {machine.notes && (
                        <p className="mt-1 max-w-xs text-xs font-normal text-ink/70">
                          {machine.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {machine.model && <p>Model: {machine.model}</p>}
                      {machine.specifications && (
                        <p className="mt-1 max-w-lg whitespace-pre-wrap text-ink/80">
                          {machine.specifications}
                        </p>
                      )}
                      {!machine.model && !machine.specifications && (
                        <span className="text-ink/60">No model or specifications</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span
                        className={
                          machine.status === "available"
                            ? "rounded-full bg-success/10 px-2 py-1 text-xs font-semibold text-success"
                            : archived
                              ? "rounded-full bg-ink/10 px-2 py-1 text-xs font-semibold text-ink/70"
                              : "rounded-full bg-accent/20 px-2 py-1 text-xs font-semibold text-ink"
                        }
                      >
                        {formatMachineStatus(machine.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="min-h-9 rounded-md border border-ink/40 bg-surface px-3 py-1 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          disabled={machineProcessingId === machine.id}
                          onClick={() => openEditMachineWindow(machine)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="min-h-9 rounded-md border border-maroon/50 bg-surface px-3 py-1 text-sm font-semibold text-maroon hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={machineProcessingId === machine.id}
                          onClick={() => void toggleMachineArchive(machine)}
                          type="button"
                        >
                          {machineProcessingId === machine.id
                            ? "Saving..."
                            : archived
                              ? "Restore"
                              : "Archive"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!machinesLoading && filteredMachines.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-ink/70" colSpan={4}>
                    {showArchived
                      ? "No machines match your search."
                      : "No active machines match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
      {isMachineWindowOpen ? (
        <div
          aria-labelledby="machine-window-heading"
          aria-modal="true"
          className="fixed inset-0 z-30 flex items-center justify-center bg-charcoal/60 p-4"
          role="dialog"
        >
          <form
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-ink/20 border-t-[3px] border-t-gold bg-surface p-5"
            onSubmit={saveMachine}
          >
            <h2
              className="mb-4 text-lg font-semibold text-ink"
              id="machine-window-heading"
            >
              {editingMachineId !== null ? "Edit Machine" : "Add Machine"}
            </h2>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-ink">
                Name
                <input
                  autoFocus
                  className="mt-1 min-h-10 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  maxLength={100}
                  onChange={(event) =>
                    setMachineForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                  value={machineForm.name}
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Model
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  maxLength={120}
                  onChange={(event) =>
                    setMachineForm((current) => ({
                      ...current,
                      model: event.target.value,
                    }))
                  }
                  value={machineForm.model}
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Specifications
                <textarea
                  className="mt-1 min-h-24 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  maxLength={5000}
                  onChange={(event) =>
                    setMachineForm((current) => ({
                      ...current,
                      specifications: event.target.value,
                    }))
                  }
                  value={machineForm.specifications}
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Status
                <select
                  className="mt-1 min-h-10 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  onChange={(event) => {
                    const status = machineStatuses.find(
                      (option) => option === event.target.value,
                    );
                    if (status) {
                      setMachineForm((current) => ({ ...current, status }));
                    }
                  }}
                  value={machineForm.status}
                >
                  {machineStatuses.map((status) => (
                    <option key={status} value={status}>
                      {formatMachineStatus(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-ink">
                Notes
                <textarea
                  className="mt-1 min-h-20 w-full rounded-md border border-ink/40 bg-surface px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  maxLength={5000}
                  onChange={(event) =>
                    setMachineForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  value={machineForm.notes}
                />
              </label>
            </div>
            {machineFormError && (
              <p
                className="mt-4 rounded bg-alert px-3 py-2 text-sm text-alert-text"
                role="alert"
              >
                {machineFormError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="min-h-10 rounded-md border border-ink/40 bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                disabled={machineSaving}
                onClick={closeMachineWindow}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-10 rounded-md bg-maroon px-4 py-2 text-sm font-semibold text-surface hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
                disabled={machineSaving}
                type="submit"
              >
                {machineSaving
                  ? "Saving..."
                  : editingMachineId !== null
                    ? "Save Changes"
                    : "Add Machine"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </StaffShell>
  );
}
