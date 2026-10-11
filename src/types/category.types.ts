export const CATEGORY_DIRECTIONS = ["INCOME", "EXPENSE"] as const;
export type CategoryDirection = (typeof CATEGORY_DIRECTIONS)[number];

export interface ICategory {
  id: string;
  name: string;
  nameBn: string;
  type: CategoryDirection;
  // A kebab-case icon name the app renders, e.g. "utensils", "shopping-bag".
  icon: string | null;
  linkedAccountTemplateId: string | null;
  linkedAccountTemplate: { id: string; name: string; nameBn: string } | null;
  isActive: boolean;
  displayOrder: number;
}

export interface ICategoryPayload {
  name: string;
  nameBn: string;
  type: CategoryDirection;
  // null clears these.
  icon: string | null;
  linkedAccountTemplateId: string | null;
  displayOrder: number;
}
