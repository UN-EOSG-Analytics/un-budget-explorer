export interface BudgetItem {
  row_type: 'grand_total' | 'part_total' | 'section_total' | 'entity_total';
  Part: string;
  'Part name': string;
  Section: string | null;
  'Section name': string | null;
  'Entity name': string | null;
  '2025 approved': number;
  '2026 proposed programme budget': number;
  'UN80 changes (excluding transitional capacities) – Relocation': number | null;
  'UN80 changes (excluding transitional capacities) – Consolidation': number | null;
  'UN80 changes (excluding transitional capacities) – Other': number | null;
  'UN80 changes (excluding transitional capacities) – Total': number | null;
  '2026 revised estimate': number;
  'Variance (excluding resources redeployed for consolidation) – Compared with 2025 approved (percentage)': number | null;
  'Variance (excluding resources redeployed for consolidation) – Compared with 2026 proposed programme budget (percentage)': number | null;
  'Transitional capacities': number | null;
  footnotes: string | null;
  chapter_title: string | null;
}

export interface Narrative {
  prefix: string;
  level: number;
  text: string;
}

export interface ResourceTable {
  headers: string[];
  rows: string[][];
}

export interface DetailItem {
  num: number;
  section: string;
  entity: string;
  narratives: Narrative[];
  resource_table: ResourceTable | null;
}

export interface TreemapEntity {
  id: string;
  name: string;
  part: string;
  partName: string;
  section: string;
  sectionName: string;
  budget: number;
  budgetItem: BudgetItem;
}

export interface TreemapSection {
  section: string;
  sectionName: string;
  entities: TreemapEntity[];
  totalBudget: number;
}

export interface TreemapPart {
  part: string;
  partName: string;
  sections: TreemapSection[];
  totalBudget: number;
  color: string;
  approved2025: number;
  varianceVs2025: number;
}

