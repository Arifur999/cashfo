import type { IItemsPageBody } from "./api.types";

// Real, authenticatable `User` rows that own more than one workspace
// (`Business`), plus the estimated 50%-of-plan-price monthly add-on fee each
// extra workspace represents. A computed ledger figure only -- no payment is
// charged for it yet. Decimal amounts arrive as fixed-2dp strings.
export interface IWorkspaceOverviewItem {
  userId: string;
  name: string;
  email: string;
  planName: string | null;
  planPrice: string | null;
  totalWorkspaces: number;
  additionalWorkspaces: number;
  estimatedMonthlyAddOnRevenue: string;
}

export interface IWorkspaceOverviewSummary {
  totalUsers: number;
  totalAdditionalWorkspaces: number;
  totalEstimatedMonthlyAddOnRevenue: string;
}

export interface IWorkspaceOverviewBody extends IItemsPageBody<IWorkspaceOverviewItem> {
  summary: IWorkspaceOverviewSummary;
}

export interface IWorkspaceOverview {
  summary: IWorkspaceOverviewSummary;
  items: IWorkspaceOverviewItem[];
}
