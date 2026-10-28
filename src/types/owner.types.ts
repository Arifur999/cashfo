// Real `User` rows (the account owners of the end-user app), as the User
// Management and Manage Owners pages see them.
export const OWNER_STATUSES = ["ACTIVE", "SUSPENDED", "PENDING_DELETION", "DELETED"] as const;
export type OwnerStatus = (typeof OWNER_STATUSES)[number];

export interface IOwnerOverviewItem {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  businessId: string | null;
  businessName: string | null;
  businessType?: "PERSONAL" | "BUSINESS" | "GROUP" | null;
  planId: string | null;
  planName: string | null;
  // The end of a running free trial ("Trial ends 4 Oct" under the plan).
  trialEndsAt?: string | null;
  workspaceCount: number;
  lastLoginAt: string | null;
  // Real (from User.createdAt) -- there's deliberately no "days left" or
  // "expired": nothing on User/Business tracks a trial or subscription expiry.
  daysUsing: number;
  status: OwnerStatus;
  // When an account waiting to be deleted goes for good (PENDING_DELETION).
  deletionScheduledFor?: string | null;
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
  // The reason the admin typed (suspend, plan change), if any.
  reason?: string | null;
  createdAt: string;
}

// The person's page (AdminUserDetail): the numbers across their
// workspaces, the workspaces, where they are signed in, billing, referrals
// and tickets.
export interface IOwnerStats {
  workspaces: number;
  // The plan's own number of workspaces; null = no limit.
  workspaceLimit: number | null;
  wallets: number;
  walletKinds: { cash: number; bank: number; mfs: number; savings: number };
  transactionsLast30d: number;
  referralFriends: number;
  // Friends whose first payment went through.
  referralBought: number;
  referralEarned: string;
}

export interface IOwnerWorkspace {
  id: string;
  name: string;
  type: "PERSONAL" | "BUSINESS" | "GROUP";
  isDefault: boolean;
  createdAt: string;
  transactionCount: number;
  includedInPlan: boolean;
  // No extra-workspace pricing exists yet: always null today.
  monthlyFee: string | null;
}

export interface IOwnerDevice {
  id: string;
  deviceLabel: string | null;
  ipAddress: string | null;
  place: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  signedIn: boolean;
}

export interface IOwnerBilling {
  planName: string;
  price: string | null;
  cycle: "FREE" | "MONTHLY" | "YEARLY" | string;
  status: string;
  trialEndsAt: string | null;
  renewsOn: string | null;
  endsOn: string | null;
  paidSoFar: string | null;
  paymentCount: number;
  firstCoupon: { code: string; usedAt: string } | null;
  extraWorkspaceFee: string | null;
}

export interface IOwnerTicket {
  id: string;
  number?: number;
  subject: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface IOwnerDetail {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  status: OwnerStatus;
  createdAt: string;
  lastLoginAt: string | null;
  preferredLanguage?: string | null;
  // Asked to delete their account: purged on scheduledFor unless they sign
  // in first or support cancels it.
  deletion?: { requestedAt: string | null; scheduledFor: string | null } | null;
  twoFactorEnabled?: boolean;
  businessId: string | null;
  businessName: string | null;
  businessType?: "PERSONAL" | "BUSINESS" | "GROUP" | null;
  planId: string | null;
  planName: string | null;
  workspaceCount: number;
  suspendedReason: string | null;
  suspendedAt: string | null;
  activityLog: IOwnerActivityLogEntry[];
  // The page's cards (backend 7a); absent from an older API.
  stats?: IOwnerStats;
  workspaces?: IOwnerWorkspace[];
  devices?: IOwnerDevice[];
  signedInDevices?: number;
  billing?: IOwnerBilling | null;
  support?: { open: number; closed: number; latest: IOwnerTicket[] };
  tabCounts?: { billing: number; support: number; notes: number };
}

// "Notes for admins" on a person's page; the customer never sees them.
export interface IOwnerNote {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
  // The author, or a super admin, may remove it.
  canDelete: boolean;
}

export interface ISuspendOwnerPayload {
  reason: string;
  // "Also sign out of every device now"; the API takes it as on if left out.
  signOutEverywhere?: boolean;
}

export interface IChangeOwnerPlanPayload {
  newPlanId: string;
  reason: string;
}

// The fields the owner action dialogs need -- satisfied by both the list
// row and the detail record.
export type IOwnerRef = Pick<IOwnerOverviewItem, "userId" | "name" | "status" | "planId" | "planName">;

export type OwnerDialog = "suspend" | "activate" | "changePlan" | "restore";
