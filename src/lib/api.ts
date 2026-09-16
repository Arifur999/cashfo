// Server-side only -- there is no NEXT_PUBLIC_ prefix here on purpose. The
// browser never talks to the backend directly; it always goes through this
// Next.js server (Server Actions / proxy), so the backend URL never needs to
// reach client bundles.
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:5000";

export type AdminRole = "SUPER_ADMIN" | "SUPPORT_ADMIN" | "FINANCE_ADMIN" | "CONTENT_ADMIN";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  adminUser: AdminUser;
}

interface NestErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export function getApiErrorMessage(body: unknown, fallback = "Something went wrong"): string {
  const err = body as NestErrorBody | undefined;
  if (!err?.message) return fallback;
  return Array.isArray(err.message) ? err.message.join(", ") : err.message;
}

export type PlatformUserStatus = "ACTIVE" | "SUSPENDED" | "BANNED" | "PENDING_DELETION";

export interface PlatformUserPlan {
  id: string;
  name: string;
  slug: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: PlatformUserStatus;
  planId: string | null;
  plan: PlatformUserPlan | null;
  workspaceCount: number;
  signupSource: string | null;
  lastLoginAt: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
  adminUser: { id: string; name: string };
}

export interface PlatformUserDetail extends PlatformUser {
  activityLog: AuditLogEntry[];
}

export interface ListMeta {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
}

export interface ListPlatformUsersResponse {
  data: PlatformUser[];
  meta: ListMeta;
}

export interface SubscriptionPlanOption {
  id: string;
  name: string;
  slug: string;
}

export type BillingCycle = "FREE" | "MONTHLY" | "YEARLY";

export interface FeatureLimits {
  maxWorkspaces: number;
  maxBusinessWorkspaces: number;
  maxTransactionsPerMonth: number;
  advancedReports: boolean;
  pdfExport: boolean;
  multiUser: boolean;
  incomeGoalTracking: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  billingCycle: BillingCycle;
  price: string;
  currency: string;
  trialDays: number;
  isActive: boolean;
  featureLimits: FeatureLimits;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlanDetail extends SubscriptionPlan {
  userCount: number;
}

export interface PlanAnalyticsEntry {
  planId: string;
  planName: string;
  billingCycle: BillingCycle;
  totalUsers: number;
  activeUsers: number;
  revenueEstimate: number;
}

export interface PlanAnalytics {
  perPlan: PlanAnalyticsEntry[];
  summary: {
    totalUsers: number;
    freeUsers: number;
    paidUsers: number;
    freePercentage: number;
    paidPercentage: number;
    totalRevenueEstimate: number;
  };
}

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";
export type CouponStatus = "ACTIVE" | "EXPIRED" | "DISABLED" | "SCHEDULED";

export interface Coupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: string;
  maxRedemptions: number | null;
  timesRedeemed: number;
  validFrom: string;
  validUntil: string;
  applicablePlans: string[];
  isActive: boolean;
  createdAt: string;
  status: CouponStatus;
}

export interface CouponRedemption {
  id: string;
  couponId: string;
  platformUserId: string;
  planId: string;
  redeemedAt: string;
  plan: { id: string; name: string };
  platformUser: { id: string; name: string; email: string } | null;
}

export type PaymentGateway = "BKASH" | "NAGAD" | "SSLCOMMERZ" | "CARD" | "MANUAL";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
export type RefundStatus = "PENDING" | "COMPLETED" | "REJECTED";

export interface Refund {
  id: string;
  paymentId: string;
  amount: string;
  reason: string;
  processedBy: string;
  status: RefundStatus;
  createdAt: string;
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
}

export interface Payment {
  id: string;
  platformUserId: string;
  planId: string;
  plan: { id: string; name: string; slug: string };
  platformUser: { id: string; name: string; email: string } | null;
  amount: string;
  currency: string;
  discountApplied: string | null;
  couponId: string | null;
  gateway: PaymentGateway;
  gatewayReferenceId: string | null;
  status: PaymentStatus;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
  invoice: InvoiceSummary | null;
}

export interface PaymentDetail extends Omit<Payment, "invoice"> {
  invoice: Invoice | null;
  refund: Refund | null;
}

export interface ListPaymentsResponse {
  data: Payment[];
  meta: ListMeta;
}

export interface Invoice {
  id: string;
  paymentId: string;
  invoiceNumber: string;
  issuedTo: string;
  lineItems: { description: string; amount: number }[];
  totalAmount: string;
  pdfUrl: string | null;
  createdAt: string;
}

export interface InvoiceListItem extends Invoice {
  payment: { id: string; platformUserId: string; planId: string };
}

export interface InvoiceDetail extends Invoice {
  payment: { id: string; plan: { id: string; name: string } } & Record<string, unknown>;
}

export interface ListInvoicesResponse {
  data: InvoiceListItem[];
  meta: ListMeta;
}

export interface RevenueByPlanEntry {
  planId: string;
  planName: string;
  amount: number;
}

export interface RevenueTrendPoint {
  month: string;
  amount: number;
}

export interface RevenueSummary {
  totalRevenue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  mrr: number;
  revenueByPlan: RevenueByPlanEntry[];
  revenueTrend: RevenueTrendPoint[];
}

export interface ChurnData {
  churnedThisMonth: number;
  startOfMonthPaidCount: number;
  currentPaidCount: number;
  churnRatePercent: number;
}

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
export type WorkspaceType = "PERSONAL" | "BUSINESS";

export interface AccountTemplate {
  id: string;
  name: string;
  nameBn: string;
  accountType: AccountType;
  accountSubtype: string | null;
  parentId: string | null;
  appliesTo: WorkspaceType[];
  displayOrder: number;
  isActive: boolean;
  children?: AccountTemplate[];
}

export type CategoryDirection = "INCOME" | "EXPENSE";

export interface DefaultCategory {
  id: string;
  name: string;
  nameBn: string;
  type: CategoryDirection;
  icon: string | null;
  linkedAccountTemplateId: string | null;
  linkedAccountTemplate: { id: string; name: string; nameBn: string } | null;
  isActive: boolean;
  displayOrder: number;
}

export interface TranslationStringRow {
  id: string;
  key: string;
  en: string;
  bn: string;
  context: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export type AnnouncementType = "INFO" | "WARNING" | "PROMOTION" | "MAINTENANCE";
export type AnnouncementComputedStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "DISABLED";

export interface AnnouncementRow {
  id: string;
  title: string;
  titleBn: string | null;
  body: string;
  bodyBn: string | null;
  type: AnnouncementType;
  targetPlan: string | null;
  startAt: string;
  endAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  status: AnnouncementComputedStatus;
}

export type LegalDocType = "TERMS_OF_SERVICE" | "PRIVACY_POLICY" | "REFUND_POLICY" | "FAQ";

export interface LegalDocumentRow {
  id: string;
  type: LegalDocType;
  contentEn: string;
  contentBn: string | null;
  version: number;
  updatedAt: string;
  updatedBy: string | null;
}

export type TicketCategory = "BILLING" | "TECHNICAL" | "ACCOUNT" | "FEATURE_REQUEST" | "BUG_REPORT" | "OTHER";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_ON_USER" | "RESOLVED" | "CLOSED";
export type SenderType = "ADMIN" | "USER";

export interface TicketMessageRow {
  id: string;
  ticketId: string;
  senderType: SenderType;
  senderId: string;
  message: string;
  attachmentUrl: string | null;
  createdAt: string;
}

export interface TicketListUser {
  id: string;
  name: string;
  email: string;
}

export interface TicketListAdmin {
  id: string;
  name: string;
}

export interface SupportTicket {
  id: string;
  platformUserId: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedToAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  platformUser: TicketListUser | null;
  assignedAdmin: TicketListAdmin | null;
}

export interface SupportTicketDetail extends Omit<SupportTicket, "platformUser"> {
  messages: TicketMessageRow[];
  platformUser: (TicketListUser & { plan: { id: string; name: string } | null }) | null;
}

export interface ListTicketsResponse {
  data: SupportTicket[];
  meta: ListMeta;
}

export interface TicketCategoryCount {
  category: TicketCategory;
  count: number;
}

export interface TicketPriorityCount {
  priority: TicketPriority;
  count: number;
}

export interface TicketStats {
  openCount: number;
  inProgressCount: number;
  urgentCount: number;
  avgResolutionHours: number;
  byCategory: TicketCategoryCount[];
  byPriority: TicketPriorityCount[];
}

export type FeatureRequestStatus = "SUBMITTED" | "UNDER_REVIEW" | "PLANNED" | "IN_PROGRESS" | "SHIPPED" | "DECLINED";

export interface FeatureRequestRow {
  id: string;
  platformUserId: string;
  title: string;
  description: string;
  status: FeatureRequestStatus;
  voteCount: number;
  createdAt: string;
}

export interface AdminOption {
  id: string;
  name: string;
  role: AdminRole;
}

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
}

export interface FeatureUsageEntry {
  eventType: string;
  count: number;
}

export interface EngagementPoint {
  date: string;
  dau: number;
  wau: number;
}

export interface CohortRow {
  cohortMonth: string;
  cohortSize: number;
  monthsSinceSignup: (number | null)[];
}

export interface GeographyCountryEntry {
  country: string;
  eventCount: number;
  userCount: number;
}

export interface GeographyCityEntry {
  city: string;
  country: string;
  eventCount: number;
  userCount: number;
}

export interface GeographyResponse {
  countries: GeographyCountryEntry[];
  cities: GeographyCityEntry[];
}

export type DeviceType = "MOBILE" | "DESKTOP" | "TABLET";

export interface DeviceBreakdownEntry {
  deviceType: DeviceType;
  count: number;
  percentage: number;
}

export interface AuditLogAdminRef {
  id: string;
  name: string;
}

export interface AuditLogEntryRow {
  id: string;
  adminUserId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
  adminUser: AuditLogAdminRef;
}

export interface ListAuditLogsResponse {
  data: AuditLogEntryRow[];
  meta: ListMeta;
}

export interface LoginAttemptRow {
  id: string;
  email: string;
  ipAddress: string;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  createdAt: string;
}

export interface ListLoginAttemptsResponse {
  data: LoginAttemptRow[];
  meta: ListMeta;
}

export interface TopIpEntry {
  ipAddress: string;
  count: number;
}

export interface LoginAttemptsSummary {
  failedLast24h: number;
  failedLast7d: number;
  topIps: TopIpEntry[];
  lockedOutAccounts: number;
}

export type SuspiciousActivityType = "MULTIPLE_FAILED_LOGINS" | "UNUSUAL_LOGIN_LOCATION" | "MASS_DATA_ACCESS" | "IMPERSONATION_SPIKE" | "OTHER";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type FlagStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "FALSE_POSITIVE";

export interface SuspiciousActivityFlagRow {
  id: string;
  type: SuspiciousActivityType;
  description: string;
  relatedAdminId: string | null;
  relatedIp: string | null;
  severity: Severity;
  status: FlagStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  relatedAdmin: AuditLogAdminRef | null;
  reviewer: AuditLogAdminRef | null;
}

export interface RunDetectionResult {
  scanned: number;
  ipsOverThreshold: number;
  flagsCreated: number;
}

export type AdminStatus = "ACTIVE" | "SUSPENDED";

export interface FullAdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export type BackupRecordType = "MANUAL" | "SCHEDULED";
export type BackupRecordStatus = "IN_PROGRESS" | "SUCCESS" | "FAILED";

export interface BackupRecordRow {
  id: string;
  triggeredBy: string;
  type: BackupRecordType;
  status: BackupRecordStatus;
  sizeMb: number | null;
  fileLocation: string | null;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface BackupStatusSummary {
  lastSuccessfulBackupAt: string | null;
  daysSinceLastBackup: number | null;
  successRate30d: number | null;
}

export interface FeatureFlagRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  rolloutPercent: number;
  targetPlanIds: string[];
  updatedAt: string;
  updatedBy: string | null;
}

export type ErrorLogSource = "BACKEND_API" | "ADMIN_FRONTEND" | "BACKGROUND_JOB";

export interface ErrorLogRow {
  id: string;
  source: ErrorLogSource;
  message: string;
  stackTrace: string | null;
  severity: Severity;
  metadata: unknown;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface ListErrorLogsResponse {
  data: ErrorLogRow[];
  meta: ListMeta;
}

export interface ApiRateLimitLogRow {
  id: string;
  endpoint: string;
  windowStart: string;
  requestCount: number;
  limitExceeded: boolean;
  identifierType: string;
  identifier: string;
}

export interface ListRateLimitLogsResponse {
  data: ApiRateLimitLogRow[];
  meta: ListMeta;
}

export interface TopEndpointEntry {
  endpoint: string;
  requestCount: number;
}

export interface TopOffenderEntry {
  identifier: string;
  identifierType: string;
  count: number;
}

export interface RateLimitSummary {
  topEndpoints: TopEndpointEntry[];
  exceededToday: number;
  topOffenders: TopOffenderEntry[];
}

export type NotificationChannel = "EMAIL" | "SMS" | "IN_APP_PUSH";

export interface NotificationTemplateRow {
  id: string;
  key: string;
  channel: NotificationChannel;
  subjectEn: string | null;
  subjectBn: string | null;
  bodyEn: string;
  bodyBn: string;
  variables: string[];
  isActive: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export type NotificationLogStatus = "QUEUED" | "SENT" | "FAILED";

export interface NotificationLogRow {
  id: string;
  platformUserId: string;
  templateKey: string;
  channel: NotificationChannel;
  status: NotificationLogStatus;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  platformUser: { id: string; name: string; email: string } | null;
}

export interface ListNotificationLogsResponse {
  data: NotificationLogRow[];
  meta: ListMeta;
}

export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "CANCELLED";

export interface CampaignTargetFilter {
  planId?: string;
  status?: PlatformUserStatus;
}

export interface BulkNotificationCampaignRow {
  id: string;
  title: string;
  templateKey: string;
  targetFilter: CampaignTargetFilter;
  channel: NotificationChannel;
  status: CampaignStatus;
  scheduledFor: string | null;
  sentCount: number;
  failedCount: number;
  createdBy: string;
  createdAt: string;
}

export interface DashboardSummary {
  totalUsers: number;
  newUsersLast30d: number;
  openTickets: number;
  mrr: number | null;
  pendingFlags: number | null;
  lastBackup: { completedAt: string | null; sizeMb: number | null } | null;
  recentAuditLogs: { id: string; action: string; entityType: string; adminName: string; createdAt: string }[] | null;
}

// Real, authenticatable `User` rows (not the `PlatformUser` read-model above)
// that own more than one workspace (`Business`), plus the estimated 50%-of-
// plan-price monthly add-on fee each extra workspace represents. A computed/
// ledger figure only -- no real payment is charged for it yet.
export interface WorkspaceOverviewItem {
  userId: string;
  name: string;
  email: string;
  planName: string | null;
  planPrice: string | null;
  totalWorkspaces: number;
  additionalWorkspaces: number;
  estimatedMonthlyAddOnRevenue: string;
}

export interface WorkspaceOverviewResponse {
  summary: { totalUsers: number; totalAdditionalWorkspaces: number; totalEstimatedMonthlyAddOnRevenue: string };
  items: WorkspaceOverviewItem[];
  page: number;
  limit: number;
  totalCount: number;
}

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  defaultCurrency: string;
  defaultTimezone: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  referralRewardAmount: number;
}
