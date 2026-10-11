export interface IAuditLogEntry {
  id: string;
  adminUserId: string;
  // e.g. "USER_SUSPENDED" -- see lib/auditActionLabels.ts for the wording.
  action: string;
  entityType: string;
  entityId: string | null;
  // Free-form JSON snapshots of the record before / after the action.
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
  adminUser: { id: string; name: string };
}
