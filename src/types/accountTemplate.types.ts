export const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type WorkspaceType = "PERSONAL" | "BUSINESS" | "GROUP";

// GROUP workspaces keep their own, simpler ledger, so default accounts are
// only ever seeded into these two.
export const TEMPLATE_WORKSPACE_TYPES = ["PERSONAL", "BUSINESS"] as const satisfies readonly WorkspaceType[];

export interface IAccountTemplate {
  id: string;
  name: string;
  nameBn: string;
  accountType: AccountType;
  // e.g. "cash", "bank", "mfs", "receivable", "payable"
  accountSubtype: string | null;
  parentId: string | null;
  appliesTo: WorkspaceType[];
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // The list is one level deep: top-level accounts carry their direct
  // children, children carry none.
  children?: IAccountTemplate[];
}

export interface IAccountTemplatePayload {
  name: string;
  nameBn: string;
  accountType: AccountType;
  // null clears it.
  accountSubtype: string | null;
  appliesTo: WorkspaceType[];
  displayOrder: number;
  parentId?: string;
}
