export type MachineStatus =
  | "available"
  | "in_use"
  | "maintenance"
  | "archived";

export type CatalogMachine = {
  id: number;
  name: string;
  model: string | null;
  specifications: string | null;
  status: MachineStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
