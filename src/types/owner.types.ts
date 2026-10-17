// Real `User` rows (the account owners of the end-user app), as the User
// Management and Manage Owners pages see them.
export const OWNER_STATUSES = ["ACTIVE", "SUSPENDED", "DELETED"] as const;
export type OwnerStatus = (typeof OWNER_STATUSES)[number];

export interface IOwnerOverviewItem {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  businessId: string | null;
  businessName: string | null;
  planId: string | null;
  planName: string | null;
  workspaceCount: number;
  lastLoginAt: string | null;
  // Real (from User.createdAt) -- there's deliberately no "days left" or
  // "expired": nothing on User/Business tracks a trial or subscription expiry.
  daysUsing: number;
  status: OwnerStatus;
}

// One page of the list, with how many owners each status holds under the
// same search and plan filter (the status tabs).
export interface IOwnersPage {
  items: IOwnerOverviewItem[];
  statusCounts: Record<OwnerStatus, number>;
}

export interface IOwnerActivityLogEntry {
  id: string;
  action: string;
  entityType: string;
  adminName: string;
  createdAt: string;
}

export interface IOwnerDetail {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  status: OwnerStatus;
  createdAt: string;
  lastLoginAt: string | null;
  businessId: string | null;
  businessName: string | null;
  planId: string | null;
  planName: string | null;
  workspaceCount: number;
  suspendedReason: string | null;
  suspendedAt: string | null;
  activityLog: IOwnerActivityLogEntry[];
}

export interface ISuspendOwnerPayload {
  reason: string;
}

export interface IChangeOwnerPlanPayload {
  newPlanId: string;
  reason: string;
}

// The fields the owner action dialogs need -- satisfied by both the list
// row and the detail record.
export type IOwnerRef = Pick<IOwnerOverviewItem, "userId" | "name" | "status" | "planId" | "planName">;

export type OwnerDialog = "suspend" | "activate" | "changePlan";
