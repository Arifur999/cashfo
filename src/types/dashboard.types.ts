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
