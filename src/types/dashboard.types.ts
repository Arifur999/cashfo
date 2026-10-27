export interface IDashboardAuditLog {
  id: string;
  action: string;
  entityType: string;
  adminName: string;
  createdAt: string;
}

export interface IDashboardLastBackup {
  completedAt: string | null;
  sizeMb: number | null;
}

// A null section means the admin's role can't see that area (revenue is for
// finance roles; flags, backups and the audit trail are SUPER_ADMIN only).
export interface IDashboardSummary {
  totalUsers: number;
  newUsersLast30d: number;
  openTickets: number;
  mrr: number | null;
  pendingFlags: number | null;
  lastBackup: IDashboardLastBackup | null;
  recentAuditLogs: IDashboardAuditLog[] | null;
}

// GET /admin/dashboard/summary?period= -- the AdminDashboard board's cards
// in one call. Each part is null for a role that doesn't see it.
export type DashboardPeriod = "7d" | "30d" | "90d";
export const DASHBOARD_PERIODS: readonly DashboardPeriod[] = ["7d", "30d", "90d"];

export interface IDashboardAttention {
  payoutRequests: { count: number; amount: string } | null;
  ticketsNoReply: { count: number; oldestWaitingSince: string | null } | null;
  failedPayments7d: { count: number } | null;
  securityFlags: { open: number; high: number } | null;
  newErrors24h: { count: number; high: number } | null;
}

export interface IDashboardPlanRow {
  planId: string;
  name: string;
  price: string;
  billingCycle: string;
  count: number;
  pct: number;
}

export interface IDashboardSystem {
  api: string;
  database: { ok: boolean; latencyMs: number | null };
  email: { configured: boolean; lastSendAt: string | null; lastSendOk: boolean | null };
  paymentGateway: { configured: boolean };
  lastBackup: IDashboardLastBackup | null;
  errors24h: { count: number; high: number };
  allWorking: boolean;
}

export interface IDashboardSupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  userName: string | null;
  // null when the team answered last and the customer hasn't written back.
  waitingSince: string | null;
  pastGoal: boolean;
  updatedFrom: string;
}

export interface IDashboardSupport {
  openTickets: number;
  noReply: number;
  assignedToYou: number;
  assignedToYouPastGoal: number;
  waitingOnUser: number;
  solvedThisWeek: number;
  avgFirstReplyMinutes: number | null;
  queue: IDashboardSupportTicket[];
  topIdeas: { id: string; title: string; status: string; voteCount: number }[];
}

export interface IDashboardOverview extends IDashboardSummary {
  period: DashboardPeriod;
  attention: IDashboardAttention;
  users: { total: number; newInPeriod: number; newLast30d: number; newLast7d: number };
  activeLast30d: number;
  activePct: number;
  paidUsers: { total: number; pctOfAccounts: number; byPlan: { planId: string; planName: string | null; count: number }[] } | null;
  mrrChangePct: number | null;
  arr: number | null;
  // Sign-ups per Dhaka day over the period, oldest first.
  signupsPerDay: { date: string; count: number }[];
  // The six whole months before this one, oldest first.
  revenueByMonth: { month: string; amount: string }[] | null;
  revenueChangePct: number | null;
  revenueThisMonth: string | null;
  accountsByPlan: IDashboardPlanRow[] | null;
  deletedLeftOut: number | null;
  system: IDashboardSystem | null;
  support: IDashboardSupport | null;
}
