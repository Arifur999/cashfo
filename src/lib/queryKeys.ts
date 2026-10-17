// TanStack Query key factory. Keys are built here, never inline, so a
// mutation's invalidation can't drift from the key its list was fetched
// under. Every domain gets the same shape:
//   all             -> invalidates everything in the domain
//   list(query)     -> one filtered/paginated list
//   detail(id)      -> one record
const createDomainKeys = <TDomain extends string>(domain: TDomain) => ({
  all: [domain] as const,
  list: (queryString = "") => [domain, "list", queryString] as const,
  detail: (id: string) => [domain, "detail", id] as const,
});

export const queryKeys = {
  owners: createDomainKeys("owners"),
  workspaces: createDomainKeys("workspaces"),
  plans: createDomainKeys("plans"),
  coupons: createDomainKeys("coupons"),
  payments: createDomainKeys("payments"),
  invoices: createDomainKeys("invoices"),
  accountTemplates: createDomainKeys("account-templates"),
  categories: createDomainKeys("categories"),
  translations: createDomainKeys("translations"),
  announcements: createDomainKeys("announcements"),
  legalDocuments: createDomainKeys("legal-documents"),
  tickets: createDomainKeys("tickets"),
  featureRequests: createDomainKeys("feature-requests"),
  auditLogs: createDomainKeys("audit-logs"),
  loginAttempts: createDomainKeys("login-attempts"),
  securityFlags: createDomainKeys("security-flags"),
  admins: createDomainKeys("admins"),
  backups: createDomainKeys("backups"),
  featureFlags: createDomainKeys("feature-flags"),
  errorLogs: createDomainKeys("error-logs"),
  health: createDomainKeys("health"),
  settings: createDomainKeys("settings"),
  rateLimits: createDomainKeys("rate-limits"),
  notificationTemplates: createDomainKeys("notification-templates"),
  notificationLogs: createDomainKeys("notification-logs"),
  campaigns: createDomainKeys("campaigns"),
  analytics: createDomainKeys("analytics"),
} as const;
