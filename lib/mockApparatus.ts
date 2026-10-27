export type ApparatusCategory =
  | "Glassware"
  | "Electronics"
  | "Tools"
  | "Machines";

export type Apparatus = {
  id: string;
  name: string;
  category: ApparatusCategory;
  availableStock: number;
};

export const mockApparatus: Apparatus[] = [
  { id: "EQ-1042", name: "Erlenmeyer Flask", category: "Glassware", availableStock: 8 },
  { id: "EQ-1187", name: "Beaker, 250 mL", category: "Glassware", availableStock: 12 },
  { id: "EQ-2031", name: "Graduated Cylinder", category: "Glassware", availableStock: 5 },
  { id: "EQ-3078", name: "Digital Multimeter", category: "Electronics", availableStock: 4 },
  { id: "EQ-4119", name: "Oscilloscope", category: "Electronics", availableStock: 2 },
  { id: "EQ-5124", name: "DC Power Supply", category: "Electronics", availableStock: 3 },
  { id: "EQ-6021", name: "Screwdriver Set", category: "Tools", availableStock: 7 },
  { id: "EQ-7016", name: "Vernier Caliper", category: "Tools", availableStock: 4 },
  { id: "EQ-8103", name: "Precision Scale", category: "Tools", availableStock: 2 },
  { id: "EQ-9028", name: "Centrifuge", category: "Machines", availableStock: 2 },
  { id: "EQ-10012", name: "Spectrophotometer", category: "Machines", availableStock: 1 },
  { id: "EQ-11005", name: "Analytical Balance", category: "Machines", availableStock: 0 },
];
