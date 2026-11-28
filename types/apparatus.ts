export type ApparatusVariant = {
  id: number;
  apparatus_id: number;
  name: string;
  total_stock: number;
  available_stock: number;
  status: "Active" | "Inactive";
  created_at: string;
};

export type ApparatusRecord = {
  id: number;
  name: string;
  category: string;
  total_stock: number;
  available_stock: number;
  status: "Active" | "Inactive";
  icon: string;
  variants: ApparatusVariant[];
};

export function isApparatusVariant(value: unknown): value is ApparatusVariant {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "apparatus_id" in value &&
    typeof value.apparatus_id === "number" &&
    "name" in value &&
    typeof value.name === "string" &&
    "total_stock" in value &&
    typeof value.total_stock === "number" &&
    "available_stock" in value &&
    typeof value.available_stock === "number" &&
    "status" in value &&
    (value.status === "Active" || value.status === "Inactive") &&
    "created_at" in value &&
    typeof value.created_at === "string"
  );
}

export function isApparatusRecord(value: unknown): value is ApparatusRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "name" in value &&
    typeof value.name === "string" &&
    "category" in value &&
    typeof value.category === "string" &&
    "total_stock" in value &&
    typeof value.total_stock === "number" &&
    "available_stock" in value &&
    typeof value.available_stock === "number" &&
    "status" in value &&
    (value.status === "Active" || value.status === "Inactive") &&
    "icon" in value &&
    typeof value.icon === "string" &&
    "variants" in value &&
    Array.isArray(value.variants) &&
    value.variants.every(isApparatusVariant)
  );
}

function normalizeVariantLabel(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

export function findVariantAlias(
  item: Pick<ApparatusRecord, "id" | "name">,
  catalog: ApparatusRecord[],
) {
  for (const parent of catalog) {
    if (
      parent.id === item.id ||
      parent.variants.length === 0 ||
      !item.name.toLocaleLowerCase().startsWith(`${parent.name.toLocaleLowerCase()} `)
    ) {
      continue;
    }

    const alias = item.name.slice(parent.name.length).trim();
    const variant = parent.variants.find(
      (candidate) =>
        normalizeVariantLabel(candidate.name) === normalizeVariantLabel(alias),
    );
    if (variant) return { parent, variant };
  }

  return null;
}

export function withoutVariantAliases<T extends ApparatusRecord>(catalog: T[]) {
  return catalog.filter((item) => !findVariantAlias(item, catalog));
}
