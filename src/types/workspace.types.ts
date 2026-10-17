import type { IItemsPageBody } from "./api.types";

// Real, authenticatable `User` rows that own more than one workspace
// (`Business`), plus the estimated 50%-of-plan-price monthly add-on fee each
// extra workspace represents. A computed ledger figure only -- no payment is
// charged for it yet. Decimal amounts arrive as fixed-2dp strings.
export interface IWorkspaceOverviewItem {
  userId: string;
  name: string;
  email: string;
  // Every workspace they own, oldest first (the personal one leads).
  workspaceNames: string[];
  planName: string | null;
  planPrice: string | null;
  totalWorkspaces: number;
  additionalWorkspaces: number;
  estimatedMonthlyAddOnRevenue: string;
}

// How many owners have 2, 3, 4... workspaces, smallest count first.
export interface IWorkspaceSpreadRow {
  workspaces: number;
  users: number;
}

export interface IWorkspaceOverviewSummary {
  totalUsers: number;
  // Every real owner, with one workspace or many.
  totalAccounts: number;
  totalAdditionalWorkspaces: number;
  totalEstimatedMonthlyAddOnRevenue: string;
  spread: IWorkspaceSpreadRow[];
}

export interface IWorkspaceOverviewBody extends IItemsPageBody<IWorkspaceOverviewItem> {
  summary: IWorkspaceOverviewSummary;
}

export interface IWorkspaceOverview {
  summary: IWorkspaceOverviewSummary;
  items: IWorkspaceOverviewItem[];
}
