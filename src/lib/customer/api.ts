// Server-side only -- there is no NEXT_PUBLIC_ prefix here on purpose. The
// browser never talks to the backend directly; it always goes through this
// Next.js server (Server Actions / proxy), same boundary as admin-frontend.
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:5000";

export type LanguagePreference = "EN" | "BN";
export type WorkspaceType = "PERSONAL" | "BUSINESS" | "GROUP";
export type MemberRole = "OWNER" | "ACCOUNTANT" | "STAFF";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  preferredLanguage: LanguagePreference;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  defaultBusinessId: string | null;
}

export interface UserBusiness {
  id: string;
  name: string;
  type: WorkspaceType;
  currency: string;
  role: MemberRole;
  isDefault: boolean;
  hasPinLock: boolean;
  // Settings › App preferences: the wallet new entries start from here.
  defaultAccountId?: string | null;
  trialEndsAt: string | null;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  // When the phone was proved with an SMS code; codes go there by SMS then.
  // Absent from an older backend.
  phoneVerifiedAt?: string | null;
  avatarUrl: string | null;
  // Settings > Profile: the wide photo over the profile (null: a gradient)
  // and a one-line address. Absent from an older backend.
  coverUrl?: string | null;
  address?: string | null;
  // Settings › Profile's details (only the person sees them), a second
  // number with its WhatsApp tick, and the number support asks for
  // ("SM-104382"). Absent from an older backend.
  occupation?: string | null;
  dateOfBirth?: string | null;
  gender?: "MALE" | "FEMALE" | "UNSAID" | null;
  district?: string | null;
  phone2?: string | null;
  phone2WhatsApp?: boolean;
  // Settings › Security › Recovery email, once proved with a code.
  recoveryEmail?: string | null;
  customerCode?: string;
  // The shareable profile card: whether it is on, and its code (the
  // referral code) for the /card/<code> link.
  profileCard?: { shared: boolean; code: string | null };
  preferredLanguage: LanguagePreference;
  emailVerifiedAt: string | null;
  // When the password was last set; null for an account that never set one
  // (Google sign-in) or set it before this was recorded.
  passwordChangedAt: string | null;
  // False for a Google-only account, which has no password to change yet.
  hasPassword?: boolean;
  // When the account was opened (the Dashboard's "Since Jan 2025"); absent
  // from a backend that doesn't send it yet.
  createdAt?: string;
  // Whether the address was confirmed from the emailed link.
  emailVerified?: boolean;
  // Settings > App > Numbers and dates; absent from an older backend.
  preferences?: DisplayPreferences;
  // Settings > Security > Alerts.
  alerts?: SecurityAlerts;
  // Settings > App > Reminders' monthly summary email.
  monthlySummaryEmail?: boolean;
  // The platform can send email; false hides what only an email can do.
  // Absent from an older backend (read as true).
  emailReady?: boolean;
  // Two-step sign-in with an authenticator app is on.
  twoFactorEnabled?: boolean;
  businesses: UserBusiness[];
  // Set when this is a super admin's read-only "View as customer" session.
  impersonatedBy?: { name: string; email: string | null } | null;
}

export type DigitStyle = "LATIN" | "BENGALI";
export type NumberGrouping = "LAKH" | "INTERNATIONAL";
export type DateStyle = "D_MMM_YYYY" | "DD_MM_YYYY" | "YYYY_MM_DD";
export type WeekStart = "SATURDAY" | "SUNDAY" | "MONDAY";

// How amounts and dates are written (PATCH /api/auth/preferences). A null
// digitStyle follows the language.
export interface DisplayPreferences {
  digitStyle: DigitStyle | null;
  numberGrouping: NumberGrouping;
  dateStyle: DateStyle;
  weekStart: WeekStart;
  // Settings › App preferences (v16). Absent from an older backend.
  roundAmounts?: boolean;
  startPage?: StartPage;
  rowsPerPage?: number;
  compactTables?: boolean;
  sidebarCollapsed?: boolean;
  fiscalYearStart?: "JANUARY" | "JULY";
  showHijri?: boolean;
}

export type StartPage = "DASHBOARD" | "REPORTS" | "INCOME_EXPENSE" | "GROUP" | "CALENDAR";

// GET|PATCH /api/auth/alerts. emailReady: the platform can send email now.
export interface SecurityAlerts {
  alertNewDevice: boolean;
  alertFailedTries: boolean;
  askCodeBeforeReset: boolean;
  emailReady?: boolean;
}

// The bell's feed (GET /api/notifications). The text is built in the app
// from `data` (lib/customer/notificationDisplay.ts), in either language.
// BILLING, REFERRAL, PAYOUT, SECURITY and IDEA rows say what happened in
// `data.event`. The backend can add a type (or an event) before the app knows
// it, so the bell treats any other value as a plain notification.
export type UserNotificationType =
  | "BUDGET"
  | "LOAN_DUE"
  | "SAVINGS"
  | "ANNOUNCEMENT"
  | "SUPPORT_REPLY"
  | "REMINDER"
  | "BILLING"
  | "REFERRAL"
  | "PAYOUT"
  | "SECURITY"
  | "CAMPAIGN"
  | "IDEA"
  | "ZAKAT"
  | "EVENT"
  | "INSIGHT";

export interface UserNotification {
  id: string;
  // The workspace it is about; null for an announcement.
  businessId: string | null;
  type: UserNotificationType;
  data: Record<string, string | number | null>;
  // About a PIN-locked workspace not opened on this device: its details
  // (names, amounts) are left out until it is.
  locked?: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationFeed {
  data: UserNotification[];
  unreadCount: number;
}

// Settings > App > Reminders.
export interface ReminderPreferences {
  budget: boolean;
  loans: boolean;
  savings: boolean;
  // The monthly summary email; left as it is when not sent.
  monthlySummaryEmail?: boolean;
  // Read only: whether the platform can send email yet.
  emailReady?: boolean;
}

// Habit-area reminders (/api/reminders): a time to be told about a habit, a
// challenge, a book or a skill, or a few minutes before a prayer, Sehri or
// Iftar. They reach the bell (a REMINDER row) and, on every device that
// turned notifications on, a push notification. To-dos keep theirs on the
// task itself (TodoItem.remindBefore), not here.
export type ReminderKind = "HABIT" | "CHALLENGE" | "TODO" | "NAMAZ" | "RAMADAN" | "BOOK" | "SKILL";
// Told at set times of the day, on set weekdays.
export type TimedReminderKind = "HABIT" | "CHALLENGE" | "BOOK" | "SKILL";
// Told a few minutes before a time the app works out (the prayer times).
export type OffsetReminderKind = "NAMAZ" | "RAMADAN";
export type SavedReminderKind = TimedReminderKind | OffsetReminderKind;

export interface Reminder {
  id: string;
  kind: SavedReminderKind;
  // Habit.id (HABIT), HabitMonthTracker.id (CHALLENGE), Book.id (BOOK),
  // Skill.id (SKILL); "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" (NAMAZ);
  // "sehri" | "iftar" (RAMADAN).
  targetKey: string;
  enabled: boolean;
  // "HH:MM" on a 24-hour Dhaka clock, 1 to 6 of them; empty for NAMAZ/RAMADAN.
  times: string[];
  // 0 = Sunday ... 6 = Saturday; empty = every day.
  weekdays: number[];
  // NAMAZ/RAMADAN: this many minutes before the time (0 to 120).
  minutesBefore: number;
  createdAt: string;
  updatedAt: string;
}

// GET /api/reminders: the master switch and every saved reminder.
export interface RemindersOverview {
  remindHabits: boolean;
  reminders: Reminder[];
}

// PUT /api/reminders, saved by (kind, targetKey).
export interface ReminderInput {
  kind: SavedReminderKind;
  targetKey: string;
  enabled: boolean;
  times?: string[];
  weekdays?: number[];
  minutesBefore?: number;
}

// POST /api/push/subscriptions: one device's push address, and the language
// its notifications are written in.
export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  locale: "en" | "bn";
}

// Settings > Help: messages to the support team (/api/support/messages).
export type SupportTopic = "TECHNICAL" | "BUG_REPORT" | "ACCOUNT" | "BILLING" | "OTHER";
export type SupportStatus = "OPEN" | "IN_PROGRESS" | "WAITING_ON_USER" | "RESOLVED" | "CLOSED";

export interface SupportMessage {
  id: string;
  senderType: "USER" | "ADMIN";
  message: string;
  // A screenshot, opened through /api/support-attachments/<id>.
  attachmentId: string | null;
  createdAt: string;
}

export interface SupportConversation {
  id: string;
  subject: string;
  category: SupportTopic | "FEATURE_REQUEST";
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
}

// Settings > Help > Have an idea? (/api/support/ideas).
export type IdeaStatus = "SUBMITTED" | "UNDER_REVIEW" | "PLANNED" | "IN_PROGRESS" | "SHIPPED" | "DECLINED";

export interface FeatureIdea {
  id: string;
  title: string;
  description: string;
  status: IdeaStatus;
  voteCount: number;
  voted: boolean;
  // The customer suggested it.
  mine: boolean;
  createdAt: string;
}

// Settings > Security > Device Management. isCurrent is a best-effort
// match on this request's ip+userAgent (see backend UserAuthService.
// listSessions()'s comment) -- not a cryptographic guarantee.
export interface UserSessionSummary {
  id: string;
  deviceLabel: string;
  ipAddress: string;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
}

// Settings > Security's "History" list -- every login attempt (success and
// failure) against this account's email.
export interface LoginHistoryEntry {
  id: string;
  ipAddress: string;
  deviceLabel: string;
  success: boolean;
  failureReason: string | null;
  createdAt: string;
}

// "Password Manager" menu -- a personal credential vault (client's own
// Facebook/bank/etc. logins), gated by its own vault password (separate
// from the account password) plus a short-lived unlock token. See
// passwordVaultActions.ts and backend/src/password-vault/.
export type VaultEntryCategory = "SOCIAL" | "BANK" | "MOBILE_BANKING" | "EMAIL" | "SHOPPING" | "WORK" | "WIFI" | "GOVERNMENT" | "OTHER";

// Never carries the actual password -- GET /api/vault/entries omits it on
// purpose (see PasswordVaultService.list()'s comment); revealVaultEntryAction
// fetches one password at a time, on demand, per entry.
export interface VaultEntrySummary {
  id: string;
  title: string;
  category: VaultEntryCategory;
  websiteUrl: string | null;
  // The account HOLDER's real name (e.g. a bank account's registered name)
  // -- distinct from usernameOrEmail below, which is the login credential.
  holderName: string | null;
  usernameOrEmail: string | null;
  notes: string | null;
  // When the password itself last changed (other edits leave it).
  passwordChangedAt: string;
  isFavorite: boolean;
  // "It's fine" on the checkup's old-password warning, until it changes.
  checkupDismissedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// The security checkup: the logins whose password is weak, used for more
// than one login, or over a year old -- ids only, never a password.
export interface VaultCheckup {
  weak: string[];
  reused: string[];
  old: string[];
}

export interface BusinessLimits {
  maxBusinessWorkspaces: number;
  currentCount: number;
  atLimit: boolean;
}

export interface BusinessDetail {
  id: string;
  name: string;
  type: WorkspaceType;
  currency: string;
  isDefault: boolean;
  phone: string | null;
  email: string | null;
  hasPinLock: boolean;
  trialEndsAt: string | null;
  monthlyFee: string | null;
  planId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Settings > Workspaces list page -- fetches GET /api/businesses (the LIST
// endpoint), distinct from the single-workspace BusinessDetail above (GET
// /api/businesses/:id). Same new fields as BusinessDetail, minus
// planId/createdAt/updatedAt (list doesn't return those), plus `role` (which
// list -- like UserBusiness -- returns per-membership and BusinessDetail
// doesn't).
export interface WorkspaceListItem {
  id: string;
  name: string;
  type: WorkspaceType;
  currency: string;
  isDefault: boolean;
  role: MemberRole;
  phone: string | null;
  email: string | null;
  hasPinLock: boolean;
  trialEndsAt: string | null;
  monthlyFee: string | null;
}

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
export type AccountStatus = "ACTIVE" | "ARCHIVED";

export interface Account {
  id: string;
  businessId: string;
  parentId: string | null;
  name: string;
  nameBn: string | null;
  accountNumber: string | null;
  // A money account's card colour (one of ACCOUNT_COLORS, balanceDisplay.ts);
  // null draws its type's own. Missing from a backend older than Balance v12.
  color?: string | null;
  accountType: AccountType;
  accountSubtype: string | null;
  // Decimal columns arrive as strings over JSON, not numbers -- same
  // convention as the admin panel (see its CLAUDE.md domain notes).
  openingBalance: string;
  currentBalance: string;
  isSystemAccount: boolean;
  status: AccountStatus;
  displayOrder: number;
  children: Account[];
}

export interface AccountGroup {
  accountType: AccountType;
  accounts: Account[];
}

export interface WalletOverviewRow {
  id: string;
  name: string;
  nameBn: string | null;
  accountNumber: string | null;
  // cash / bank / mfs, for the row's icon.
  accountSubtype: string | null;
  // The card colour (see Account.color), the day it last moved money
  // (YYYY-MM-DD) and how many entries it has: none means it can be deleted.
  // Missing from a backend older than Balance v12.
  color?: string | null;
  lastActivity?: string | null;
  entryCount?: number;
  status: AccountStatus;
  openingBalance: string;
  totalIn: string;
  totalOut: string;
  // Money moved from this account into a Savings Goal contribution --
  // always an outflow (no withdraw-from-goal flow exists yet), so shown as
  // a plain magnitude rather than signed. Split out of "adjustment" (see
  // below) rather than lumped in with it.
  savings: string;
  // Signed net effect of an actual Balance Transfer between two money
  // accounts only (+ when money arrived, - when it left) -- kept separate
  // from totalIn/totalOut, which cover real income/expense-shaped movement,
  // AND from savings (above), which is a different kind of internal
  // transfer.
  adjustment: string;
  currentBalance: string;
}

export interface WalletsOverview {
  totalAccounts: number;
  totalBalance: string;
  inactiveAmount: string;
  availableBalance: string;
  accounts: WalletOverviewRow[];
}

export interface LedgerRow {
  entryId: string;
  transactionId: string;
  transactionType: TransactionType;
  date: string;
  description: string | null;
  referenceNo: string | null;
  entryType: EntryType;
  amount: string;
  transactionStatus: TransactionStatus;
  // The posting this row's transaction reversed (a void's second half).
  reversalOfId?: string | null;
  runningBalance: string;
  // The accounts on the posting's other side (where the money came from or
  // went to) and its category, for a printed statement's particulars.
  // Missing from a backend older than the statement fix.
  counterAccounts?: string[];
  category?: string | null;
  // Received (in) or sent (out); what kind of row it is and the name its
  // To / From column shows; the contact, asset and charged transfer it
  // belongs to. Missing from a backend older than Balance v12.
  direction?: "in" | "out";
  kind?: LedgerKind;
  party?: string | null;
  contactId?: string | null;
  assetId?: string | null;
  chargeForId?: string | null;
  // A transfer's charge: the account the transfer went to.
  chargeFor?: string | null;
}

// What a ledger row is (see the backend's ledger-kind.ts).
export type LedgerKind =
  | "INCOME"
  | "EXPENSE"
  | "TRANSFER"
  | "SAVINGS"
  | "SAVINGS_WITHDRAW"
  | "LOAN_OUT"
  | "LOAN_IN"
  | "PAYMENT_IN"
  | "PAYMENT_OUT"
  | "ASSET_PURCHASE"
  | "ASSET_SALE"
  | "ADJUSTMENT"
  | "OTHER";

export interface AccountLedger {
  accountId: string;
  accountName: string;
  openingBalance: string;
  // The balance before the period (dateFrom), the same on every page.
  balanceBroughtForward: string;
  entries: LedgerRow[];
  // The whole period's closing balance, the same on every page.
  closingBalance: string;
  // The running balance before this page's first row and after its last:
  // the "brought forward" and "carried forward" lines between pages.
  // Missing from a backend older than the paged-ledger fix.
  pageOpeningBalance?: string;
  pageClosingBalance?: string;
  // Every row of the period, received and sent, and the kinds it has; and
  // whether direction, kind or search narrowed the rows (meta counts what
  // they left). Missing from a backend older than Balance v12.
  counts?: { all: number; in: number; out: number };
  kinds?: LedgerKind[];
  filtered?: boolean;
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// GET .../contacts/:id/statement: a business contact's sales, purchases and
// payments oldest first, with what they owe after each row worked out over
// their whole history (positive: they owe the business).
export type ContactStatementKind = "sale" | "purchase" | "received" | "paid";

export interface ContactStatementEntry {
  transactionId: string;
  date: string;
  kind: ContactStatementKind;
  referenceNo: string | null;
  description: string | null;
  // The wallet a payment went through; null for a sale or a purchase.
  wallet: string | null;
  amount: string;
  runningBalance: string;
  // Voided, or the reversal that voided it: shown, but not counted.
  cancelled: boolean;
}

export interface ContactStatement {
  contactId: string;
  contactName: string;
  openingBalance: string;
  balanceBroughtForward: string;
  entries: ContactStatementEntry[];
  closingBalance: string;
  pageOpeningBalance: string;
  pageClosingBalance: string;
  lastSale: ContactStatementEntry | null;
  lastPayment: ContactStatementEntry | null;
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// GET .../transactions/summary: every transaction matching the list's
// filters, across all pages.
export interface TransactionsSummary {
  count: number;
  // Voided originals among them.
  voided: number;
  // The ones that still stand: neither voided nor a reversal.
  standing?: number;
  // Transfers only: what the standing ones paid in charges (Balance v12).
  charges?: string;
  // Debit totals of the standing ones (POSTED, not a reversal), 2dp strings.
  totals: { INCOME: string; EXPENSE: string; TRANSFER: string };
}

export interface AccountSummary {
  currentBalance: string;
  totalIn: string;
  totalOut: string;
  // Signed net effect of Balance Transfer transactions only -- see
  // WalletOverviewRow.adjustment's comment. Effectively always "0.00" for a
  // non-money account (Income/Expense/Equity never has TRANSFER entries).
  adjustment: string;
  transactionCount: number;
}

// Financial Reports page (/reports/overview) -- Income/Expense by Category
// donut cards. "total" is the true total across every category in range;
// "categories" is capped at the top 10 by amount, so its percents don't
// necessarily sum to 100 when a workspace has more than 10.
export interface CategoryBreakdownRow {
  name: string;
  amount: string;
  percent: number;
  color: string;
  // How many transactions (an older API leaves it out).
  count?: number;
  // The money with no category, read as "Uncategorised".
  uncategorised?: boolean;
}

// A calendar month with any income or expense in it.
export interface ActiveMonth {
  year: number;
  month: number;
  count: number;
}

export interface CategoryBreakdown {
  type: "INCOME" | "EXPENSE";
  total: string;
  categories: CategoryBreakdownRow[];
}

// Insights › Reports: every category of one type with a column per calendar
// month ("YYYY-MM", oldest first); amounts line up with `months`.
export interface MonthlyBreakdownRow {
  name: string;
  color: string;
  amounts: string[];
  total: string;
}

export interface MonthlyBreakdown {
  type: "INCOME" | "EXPENSE";
  months: string[];
  rows: MonthlyBreakdownRow[];
  totals: string[];
  total: string;
}

// Financial Reports page's "Income vs Savings" trend chart -- one point
// per calendar month, oldest first.
export interface IncomeVsSavingsPoint {
  month: string;
  income: string;
  savings: string;
}

export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER" | "JOURNAL" | "SALE" | "PURCHASE" | "PAYMENT";
export type TransactionStatus = "POSTED" | "VOIDED";
export type EntryType = "DEBIT" | "CREDIT";

export interface TransactionEntry {
  id: string;
  transactionId: string;
  accountId: string;
  entryType: EntryType;
  amount: string;
  categoryId: string | null;
  note: string | null;
  // nameBn: the account's Bangla name, null where it has none; missing from
  // a backend older than it.
  account?: { id: string; name: string; nameBn?: string | null; accountType: AccountType; accountSubtype: string | null };
}

export interface Transaction {
  id: string;
  businessId: string;
  transactionType: TransactionType;
  transactionDate: string;
  referenceNo: string | null;
  description: string | null;
  // Real FK since Prompt 8 (was a plain unconstrained field in Prompt 5).
  contactId: string | null;
  // Populated by listTransactions() alongside contactId, for list-level UI
  // (e.g. the Loan Management Transactions page) that needs the contact's
  // name per row without a second fetch.
  contact?: { id: string; name: string } | null;
  status: TransactionStatus;
  createdBy: string;
  createdAt: string;
  voidedAt: string | null;
  voidedReason: string | null;
  reversalOfId: string | null;
  // Set by the backend: false for a voided transaction, a reversal, and a
  // posting a feature keeps its own record of (a savings goal's deposit or
  // withdrawal, an asset purchase or sale, a referral payout) -- voiding
  // only the money would leave that feature's figures wrong.
  voidable: boolean;
  // A charge (its own expense) points at the transfer or loan entry it was
  // paid with; null otherwise.
  chargeForId?: string | null;
  entries: TransactionEntry[];
  // The bank or service charge paid with this entry (a loan entry's
  // Charge column); null without one. Missing from an older backend.
  charge?: string | null;
  // The expense category that charge is filed under (an Edit keeps it).
  chargeCategory?: string | null;
  // With withLoanBalance: the contact's loan balance just after this row
  // (positive: they owe you, Pawna; negative: you owe, Dena).
  loanBalanceAfter?: string | null;
  // With withBalanceAfter: the receiving wallet's balance just after this
  // row (Balance › Transfer's Balance column).
  balanceAfter?: string | null;
  // A transfer's sending wallet just after it (and its charge), and its
  // receiving wallet; with withBalanceAfter, from Balance v12 on.
  fromBalanceAfter?: string | null;
  toBalanceAfter?: string | null;
}

// The other end of an Edit (decision D2), with its amount.
export interface CorrectionLink {
  id: string;
  amount: string;
}

// One transaction as its own page reads it: also the original it corrected,
// and the entry that corrected it.
export interface TransactionDetail extends Transaction {
  correctedFrom: CorrectionLink | null;
  correctedBy: CorrectionLink | null;
}

export interface TransactionListResponse {
  data: Transaction[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export type ContactType = "CUSTOMER" | "SUPPLIER" | "BOTH" | "RELATIVE" | "BANK" | "NGO" | "OTHER";
export type ContactStatus = "ACTIVE" | "ARCHIVED";
// BUSINESS (customer/supplier trade relationships, shown in Dena-Pawna) vs
// LOAN (bank/person lending relationships, shown in Loan Management). Both
// reuse the exact same type/openingBalance/Receivable-Payable engine.
export type ContactCategory = "BUSINESS" | "LOAN";

// Sign convention (set by the backend, Prompt 8): positive currentBalance
// means the business is OWED money by this contact; negative means the
// business OWES this contact money. Zero means settled. This holds
// regardless of `type` -- e.g. an overpaid CUSTOMER can carry a negative
// balance (a refund is owed to them). Color-coding and Prompt 9's
// receivable/payable math both key off this sign, not off `type`.
export interface Contact {
  id: string;
  businessId: string;
  name: string;
  type: ContactType;
  category: ContactCategory;
  phone: string | null;
  email: string | null;
  address: string | null;
  photoUrl: string | null;
  openingBalance: string;
  currentBalance: string;
  status: ContactStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // The newest posting with this contact; only the list endpoint sets it.
  lastActivityAt?: string | null;
}

export interface ContactListResponse {
  data: Contact[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// Prompt 9: Receivable/Payable. FIFO allocation (see
// ReceivablesPayablesService.computeDirection() on the backend) is entirely
// a read-time computation -- this breakdown is derived fresh on every
// request, never stored.
export interface InvoiceBreakdown {
  transactionId: string;
  date: string;
  description: string | null;
  originalAmount: string;
  amountPaid: string;
  remainingAmount: string;
  dueDate: string | null;
  isOverdue: boolean;
}

export interface DirectionBreakdown {
  totalInvoiced: string;
  totalPaid: string;
  // What the invoices still owe, once general payments settled the opening
  // balance first (it is the oldest amount owed). Negative when overpaid.
  remaining: string;
  // The opening balance owed on this side, and what of it is still unpaid.
  // Missing from a backend older than the fix that settles it first.
  openingOwed?: string;
  openingRemaining?: string;
  // Invoices less payments: this side's change to the contact's balance,
  // which adds the opening balance once on top. Missing alike.
  balance?: string;
  transactions: InvoiceBreakdown[];
}

export interface ContactBalanceDetail {
  contactId: string;
  openingBalance: string;
  currentBalance: string;
  receivable: DirectionBreakdown;
  payable: DirectionBreakdown;
}

export interface AgingBucketRow {
  contactId: string;
  contactName: string;
  current: string;
  days1to30: string;
  days31to60: string;
  over60: string;
  total: string;
  totalInvoiced: string;
  totalPaid: string;
}

export interface AgingReport {
  buckets: { current: string; days1to30: string; days31to60: string; over60: string };
  contacts: AgingBucketRow[];
}

export interface OverdueRow {
  contactId: string;
  contactName: string;
  transactionId: string;
  description: string | null;
  originalAmount: string;
  remainingAmount: string;
  dueDate: string;
  daysOverdue: number;
}

// An unpaid sale or purchase whose due date is within the next few days
// (Books › Receivables and payables, "Due this week").
export interface DueSoonRow {
  contactId: string;
  contactName: string;
  transactionId: string;
  description: string | null;
  remainingAmount: string;
  dueDate: string;
  // 0 for something due today.
  daysUntilDue: number;
}

export type LoanBalanceDirection = "DENA" | "PAWNA" | "SETTLED";

export interface LoanDashboardRow {
  contactId: string;
  contactName: string;
  contactPhone: string | null;
  openingBalance: string;
  totalReceive: string;
  totalPayment: string;
  // Profit or interest paid to them and received from them, all time. It
  // never moves currentBalance.
  profitPaid: string;
  profitReceived: string;
  currentBalance: string;
  direction: LoanBalanceDirection;
  // How many entries there are with them, and the newest one (an older
  // backend sends neither).
  entries?: number;
  lastEntry?: { kind: LoanActivityKind; date: string } | null;
  // The day of their first entry.
  firstEntryDate?: string | null;
}

// A loan entry by what it was: a loan given or taken, money back, or profit.
export type LoanActivityKind = "GAVE" | "TOOK" | "GOT_BACK" | "PAID_BACK" | "PROFIT_PAID" | "PROFIT_RECEIVED";

export interface LoanMonth {
  lent: string;
  borrowed: string;
  gotBack: string;
  paidBack: string;
  profitPaid: string;
  profitReceived: string;
  entries: number;
}

export interface LoanDashboard {
  totalDena: string;
  totalPawna: string;
  totalPaid: string;
  totalReceived: string;
  netBalance: string;
  activeAccounts: number;
  // Profit paid in this Asia/Dhaka year, and who most of it went to with
  // about how much a month.
  profitPaidThisYear: string;
  topProfit: { contactId: string; contactName: string; monthly: string } | null;
  // This Asia/Dhaka month's loan money (an older backend sends none).
  thisMonth?: LoanMonth;
  rows: LoanDashboardRow[];
}

// The Loan Management "Ledger" -- one contact, one date range, running
// balance carried forward (see ReceivablesPayablesService.getLoanStatement()).
// debit/credit are mutually exclusive per row (only one is non-null) --
// DEBIT means cash was Paid out, CREDIT means cash was Received, same
// convention as the Loan Transactions page's directionFor().
export interface LoanStatementRow {
  transactionId: string;
  date: string;
  referenceNo: string | null;
  description: string | null;
  category: string;
  debit: string | null;
  credit: string | null;
  // A Profit row ("Profit" category): what was paid or received. It leaves
  // runningPrincipal as it was.
  profitPaid: string | null;
  profitReceived: string | null;
  runningPrincipal: string;
  status: TransactionStatus;
  // The posting this one reversed, for a reversal.
  reversalOfId?: string | null;
  // Voided, or the reversal that voided it: listed, but not in the balance.
  cancelled?: boolean;
  // What happened, and a charge posted with it (an older backend sends
  // neither).
  kind?: LoanActivityKind;
  charge?: string | null;
}

export interface LoanStatement {
  contactId: string;
  contactName: string;
  openingBalance: string;
  balanceBroughtForward: string;
  rows: LoanStatementRow[];
  closingBalance: string;
}

export type BudgetCategoryType = "EXPENSE" | "INCOME";

// Icon/color are plain keys validated against a fixed backend allow-list
// (see backend/src/budgets/budget-category-visuals.ts) -- budgetCategoryVisuals.ts
// maps them to actual lucide icons/Tailwind classes. type distinguishes
// Expense Category from Income Category -- same shape, two different pages.
// monthlyLimit is null for INCOME -- there's no per-category income goal at
// all; see IncomeGoal below for the real (month-specific, table-based)
// income goal concept. EXPENSE categories always have a real limit.
export interface BudgetCategory {
  id: string;
  businessId: string;
  type: BudgetCategoryType;
  name: string;
  // Optional -- a category saved without ever clicking an icon in the
  // picker (e.g. searching for one that doesn't match anything, then
  // saving anyway) has no icon at all, shown as a plain colored circle.
  icon: string | null;
  color: string;
  monthlyLimit: string | null;
  displayOrder: number;
}

export interface BudgetCategorySummary extends BudgetCategory {
  spent: string;
  percent: number;
}

export interface BudgetOverview {
  month: number;
  year: number;
  type: BudgetCategoryType;
  totalBudget: string | null;
  allocated: string;
  categories: BudgetCategorySummary[];
}

// Budget Planning: one month's income target and expense budget (null when
// the month has no plan, or a plan from before budgets), and what came in
// and went out that month.
export interface MonthlyPlan {
  id: string | null;
  month: number;
  year: number;
  incomeTarget: string | null;
  expenseBudget: string | null;
  earned: string;
  spent: string;
}

// Category Set: a category and how many live transactions name it.
export interface CategorySetRow {
  id: string;
  type: BudgetCategoryType;
  name: string;
  icon: string | null;
  color: string;
  monthlyLimit: string | null;
  transactionCount: number;
  // "zakat": the Zakat page's own category -- listed, changed only there.
  system?: "zakat" | null;
}

// Money the app files under a name no category of the workspace has: the
// charges paid with transfers and loan entries ("Bank charge", ...).
export interface AutomaticCategoryRow {
  type: "EXPENSE";
  name: string;
  kind: "charges";
  transactionCount: number;
}

export interface CategorySet {
  income: CategorySetRow[];
  expense: CategorySetRow[];
  // Left out by an older backend.
  automatic?: AutomaticCategoryRow[];
}

// Savings Goals (/savings-goals/*): a named target funded by real
// contributions from a money account, landing in one of the business's own
// Savings Wallets (an Account, accountSubtype "savings" -- see
// AccountsService.listSavingsWallets()'s comment; managed at
// /savings-goals/wallet, same CRUD as Balance's own Wallet page).
// currentAmount/progressPercent/monthlyTarget are computed on read, never
// stored.
export type SavingsGoalStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "WITHDRAWN";
export type SavingsReminderChannel = "EMAIL" | "PHONE";
// ACCOUNT_CHANGE: the goal moved to another savings account and took its
// money along; what it has saved stays the same.
// PROFIT: profit the bank paid on the goal's savings, counted as income.
export type SavingsEntryType = "CONTRIBUTION" | "TRANSFER_OUT" | "TRANSFER_IN" | "WITHDRAWAL" | "ACCOUNT_CHANGE" | "PROFIT";
// Only ever set for an ACTIVE goal -- null for Paused/Completed/Withdrawn,
// where "are you saving fast enough" no longer applies. paceStatus is the
// older two-way field; pace (backend savings-plan.ts) is the plan line's.
export type SavingsGoalPaceStatus = "ON_TRACK" | "BEHIND" | "WARNING" | null;
export type SavingsGoalTrend = "INCREASING" | "DECREASING" | "STABLE" | null;
export type SavingsPlanState = "AHEAD" | "ON_TRACK" | "BEHIND";

// Where a goal stands against its plan line today: what the line says
// should be saved by now, and saved minus that (below zero is behind).
export interface SavingsGoalPace {
  expected: string;
  difference: string;
  state: SavingsPlanState;
}

// How much of a goal's money sits in one savings wallet. accountId is null
// for money from an old move whose wallet isn't known.
export interface SavingsHolding {
  accountId: string | null;
  name: string | null;
  amount: string;
}

export interface SavingsGoal {
  id: string;
  businessId: string;
  name: string;
  targetAmount: string;
  targetDate: string;
  durationMonths: number;
  reminderDate: string | null;
  reminderChannel: SavingsReminderChannel | null;
  description: string | null;
  status: SavingsGoalStatus;
  createdAt: string;
  updatedAt: string;
  currentAmount: string;
  // Only ever non-zero once withdraw() has run (always the goal's full
  // saved amount at that moment) -- currentAmount itself is back to 0 by
  // then, so this is what a WITHDRAWN card shows instead.
  withdrawnAmount: string;
  progressPercent: number;
  monthlyTarget: string;
  paceStatus: SavingsGoalPaceStatus;
  trend: SavingsGoalTrend;
  // What was already saved when the goal was made.
  startAmount: string;
  // The Dhaka day the goal was made ("2026-03-01").
  startDate: string;
  // The plan line: from planStartAmount on planStartDate to the target on
  // targetDate. Catch up and Resume move its start to the day they ran.
  planStartDate: string;
  planStartAmount: string;
  pace: SavingsGoalPace | null;
  // Money added from an account this Dhaka month.
  addedThisMonth: string;
  // Any entry at all: a goal with one can't be deleted.
  entryCount: number;
  // Largest first.
  holdings: SavingsHolding[];
  // The day it reached its target; on a withdrawn goal, it was Achieved.
  reachedAt: string | null;
  // Catch up's monthly reminder email is on.
  monthlyReminder: boolean;
  lastWithdrawal: { date: string; accountName: string | null } | null;
  // The savings account it keeps its money in: every deposit goes here.
  // Absent from an older API, null before one is chosen.
  accountId?: string | null;
  account?: { id: string; name: string | null; accountNumber: string | null } | null;
  // Its card colour (one of GOAL_COLORS, savingsColors.ts); null on an
  // older goal, which takes the colour of its place in the list.
  color?: string | null;
  // Profit the bank paid on it, all told. Absent from an older API.
  profitTotal?: string;
}

export interface SavingsGoalEntry {
  id: string;
  type: SavingsEntryType;
  amount: string;
  date: string;
  moneyAccountName: string | null;
  savingsAccountName: string | null;
  relatedGoalName: string | null;
  // Entries of one move or withdrawal across several wallets share it.
  groupId: string | null;
  // PROFIT: the income category it counts under.
  category?: string | null;
  notes: string | null;
}

export interface SavingsGoalDetail extends SavingsGoal {
  entries: SavingsGoalEntry[];
}

export interface SavingsOverview {
  totalSaved: string;
  totalGoals: string;
  remaining: string;
  progressPercent: number;
  monthlyTarget: string;
  savedThisMonth: string;
  monthlyProgressPercent: number;
  savingsRatePercent: number;
  incomeThisMonth: string;
}

// Savings Overview page (/savings-goals/overview) -- same shape as
// WalletsOverview (Balance's own Overview page): each row is a real
// Savings Wallet Account (accountSubtype "savings"), including the one
// hidden pooled system account every business still has from before this
// feature's per-wallet redesign (see backend SavingsGoalsService.
// getAccountOverview()'s comment) -- name arrives pre-labelled
// "... (Legacy Pool)" for that one row, nothing to special-case here.
export interface SavingsAccountOverviewRow {
  id: string;
  name: string;
  accountNumber: string | null;
  // Its card colour; null (or absent from an older API) takes its place's.
  color?: string | null;
  status: AccountStatus;
  openingBalance: string;
  totalIn: string;
  totalOut: string;
  currentBalance: string;
}

export interface SavingsAccountOverview {
  totalAccounts: number;
  totalBalance: string;
  inactiveAmount: string;
  availableBalance: string;
  accounts: SavingsAccountOverviewRow[];
}

export interface SavingsTransferRow {
  id: string;
  date: string;
  amount: string;
  fromGoalId: string;
  fromGoalName: string;
  toGoalId: string | null;
  toGoalName: string;
  notes: string | null;
  // A move old enough to have no group can't be undone.
  canUndo: boolean;
}

// Which goals a savings wallet's money belongs to (Savings accounts' cards
// and their By goal tab).
export interface SavingsWalletGoals {
  accountId: string;
  goals: { goalId: string; goalName: string; status: SavingsGoalStatus; amount: string; deposits: number; movedInFrom: string[] }[];
}

// One line of a savings wallet's goal history, newest first. A move or a
// withdrawal is this wallet's part of it; on a goal that moved here or away
// (ACCOUNT_IN / ACCOUNT_OUT), accountName is the other savings account.
export interface SavingsWalletHistoryRow {
  id: string;
  date: string;
  // PROFIT: accountName is the income category it counts under.
  kind: "ALREADY_SAVED" | "ADDED" | "PROFIT" | "MOVED" | "WITHDRAWN" | "ACCOUNT_IN" | "ACCOUNT_OUT";
  goalName: string;
  otherGoalName: string | null;
  accountName: string | null;
  amount: string;
  notes: string | null;
}

// PROFIT: from is the income category, to the savings account.
export type SavingsStatementKind = "ALREADY_SAVED" | "ADDED" | "PROFIT" | "MOVED_IN" | "MOVED_OUT" | "WITHDRAWN" | "ACCOUNT_CHANGED";

// A goal's statement, oldest first. from/to are names: an account, the
// savings wallets, or the other goal, as the kind says.
export interface SavingsStatement {
  goal: SavingsGoal;
  today: string;
  rows: { date: string; kind: SavingsStatementKind; from: string | null; to: string | null; notes: string | null; moneyIn: string | null; moneyOut: string | null; balance: string; moved: string | null }[];
  totals: { opening: string; moneyIn: string; moneyOut: string; balance: string };
  sources: { kind: "ACCOUNT" | "ALREADY_SAVED" | "GOAL" | "PROFIT"; name: string | null; amount: string }[];
  now: SavingsHolding[];
}

// Savings Goals > Saving plans: something to save for later. Nothing is
// saved until it is started as a goal.
export type SavingsPlanHorizon = "THREE_MONTHS" | "SIX_MONTHS" | "ONE_YEAR" | "TWO_YEARS" | "BY_DATE" | "SOMEDAY";
export type SavingsPlanPriority = "HIGH" | "MEDIUM" | "LOW";
export interface SavingsPlan {
  id: string;
  name: string;
  // trip, phone, umrah, education, wedding or others.
  category: string;
  color: string;
  amount: string;
  horizon: SavingsPlanHorizon;
  // The date picked, for BY_DATE.
  needBy: string | null;
  priority: SavingsPlanPriority;
  note: string | null;
  link: string | null;
  plannedOn: string;
  // The day it is needed by, counted from today; null for some day.
  neededBy: string | null;
  // What starting it today means a month; "0.00" with no date.
  monthly: string;
}

// Assets Management -- long-lived, non-cash things a business owns (a car,
// land, a plot, jewellery, gadgets, an investment, ...), tracked separately
// from ordinary money Accounts. See assetActions.ts and
// backend/src/assets/.
export type AssetStatus = "ACTIVE" | "SOLD";

// A per-business, user-manageable Asset category (replaces the old fixed
// 7-value enum) -- Asset.category above is just this option's `name`
// string, same loose-reference convention as BudgetCategory/
// TransactionEntry.categoryId (deleting a category here doesn't touch
// existing Asset rows that reference its name).
export interface AssetCategoryOption {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  displayOrder: number;
  // Off: left out of the Purchase and Add asset dropdowns. Missing from an
  // older backend, which means on.
  isActive?: boolean;
}

// One point-in-time value the asset was recorded at after purchase (e.g. a
// yearly revaluation) -- GET .../assets returns these embedded on the
// Asset, newest first; there's no standalone list endpoint for them.
export interface AssetValueHistoryEntry {
  id: string;
  value: string;
  recordedAt: string;
  note: string | null;
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  purchasePrice: string;
  currentValue: string;
  // The wallet that paid; null for an asset already owned (no money moved).
  purchaseAccountId: string | null;
  status: AssetStatus;
  // Only set once sellAssetAction() has run -- an ACTIVE asset carries all
  // three as null.
  soldAt: string | null;
  soldPrice: string | null;
  soldAccountId: string | null;
  // The note written with the sale.
  soldNote?: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  valueHistory: AssetValueHistoryEntry[];
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

// "Group Expense" (মেস/যৌথ হিসাব) -- a GROUP-type workspace for a mess or
// joint family splitting shared costs equally. Deliberately NOT wired into
// the "active workspace" switcher (see lib/activeBusiness.ts's comment on
// why multi-workspace switching was removed): every page under
// /group-expenses/[businessId] takes the businessId straight from the URL
// instead, so a user can have their one normal Personal/Business workspace
// AND any number of Group workspaces (this year's mess, a joint family
// ledger, ...) all reachable side by side.
export type GroupMemberStatus = "ACTIVE" | "ARCHIVED";
// Free text now, not a fixed union -- each business has its own editable
// list of category names (GroupExpenseCategoryOption below), and
// GroupExpense.category just stores whichever name was picked at creation
// time (decoupled from that list, same "loose string" convention as
// AssetCategoryOption -- see the backend schema comment for why).
export type GroupExpenseCategory = string;

// How an expense is shared: equally (everyone that day, or the members it
// names), by shares, by meals (pooled into one meal rate), or by exact
// amounts.
export type GroupSplit = "EQUAL" | "SHARES" | "MEALS" | "EXACT";
export type GroupKind = "FAMILY" | "MESS";
export type GroupPaidFrom = "FUND" | "MEMBER";
export type GroupContributionKind = "DEPOSIT" | "RETURN" | "SETTLE" | "CARRY";
// Member: gives money to an accountant. Accountant: keeps the cash and does
// the bazar (up to 2 in a group).
export type GroupMemberRole = "MEMBER" | "ACCOUNTANT";
// How costs shared "by cost split" are weighted.
export type GroupCostSplit = "EQUAL" | "CUSTOM";

export interface GroupExpenseCategoryOption {
  id: string;
  businessId: string;
  name: string;
  icon: string | null;
  color: string;
  displayOrder: number;
  // How a new expense in it is shared, to start with.
  defaultSplit: GroupSplit;
  // "Only selected": the members a new expense in it is shared by, equally.
  // Empty (or absent, from an older API) = everyone.
  defaultMemberIds?: string[];
  // Hidden: not offered for new expenses; old records keep it.
  hidden?: boolean;
  // Expenses filed under it, all time (a used one can only be hidden).
  expenseCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  photoUrl: string | null;
  status: GroupMemberStatus;
  // Their share of costs split by shares.
  shareUnits: string;
  // They share only the costs of the days from joinedOn to leftOn.
  joinedOn: string | null;
  leftOn: string | null;
  // Absent from an older API: a member.
  role?: GroupMemberRole;
  // The group's owner (the signed-in customer): can't be removed or made inactive.
  isOwner?: boolean;
  // Who their share covers ("Khaled, wife and daughter").
  household?: string | null;
  // Their percent when the group's cost split is custom.
  costPercent?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupContribution {
  id: string;
  businessId: string;
  groupMemberId: string;
  // Signed: a return is negative.
  amount: string;
  kind: GroupContributionKind;
  date: string;
  note: string | null;
  createdAt: string;
  groupMember: GroupMember;
  // The accountant it was given to ("Given to").
  receivedByMemberId?: string | null;
  receivedBy?: GroupMember | null;
  // Both rows of one settle-up share it, so Undo removes the pair.
  settleGroupId?: string | null;
}

export interface GroupExpenseSplit {
  id: string;
  expenseId: string;
  groupMemberId: string;
  units: string | null;
  amount: string | null;
}

export interface GroupExpense {
  id: string;
  businessId: string;
  amount: string;
  date: string;
  category: GroupExpenseCategory;
  description: string | null;
  paidByMemberId: string | null;
  paidByMember: GroupMember | null;
  // FUND: out of the group's cash. MEMBER: out of paidByMember's pocket.
  paidFrom: GroupPaidFrom;
  split: GroupSplit;
  // The members it names; none: everyone in the group that day.
  splits: GroupExpenseSplit[];
  createdAt: string;
}

// A group's settings (the defaults until first saved).
export interface GroupSettings {
  kind: GroupKind;
  monthStartDay: number;
  cashHolderMemberId: string | null;
  mealsOn: boolean;
  breakfastUnits: string;
  lunchUnits: string;
  dinnerUnits: string;
  costSplit?: GroupCostSplit;
  // Warn once this much of a month's budget is spent; null = never.
  budgetWarnPercent?: number | null;
  // Paused: kept out of new entries and listed last.
  pausedAt?: string | null;
}

// One member's meals on a day.
export interface GroupMeal {
  id: string;
  groupMemberId: string;
  date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  guests: string;
}

export interface GroupSettlementMemberRow {
  groupMemberId: string;
  name: string;
  // Gross deposits only (excludes returns) -- contributed stays the NET
  // figure (deposits - returned), same one closeSettlement() persists onto
  // GroupSettlementRecordMember and balance is computed from; these two are
  // for the live breakdown display only.
  grossDeposited: string;
  returned: string;
  contributed: string;
  // Whether they shared the period's costs (in the group during it).
  sharing: boolean;
  // Paid from their own pocket, credited to them.
  pocketPaid: string;
  mealUnits: string;
  mealCost: string;
  // Their share of the costs not shared by meals.
  otherShare: string;
  // mealCost + otherShare.
  share: string;
  balance: string;
}

export interface GroupSettlementResult {
  periodStart: string;
  periodEnd: string;
  totalExpense: string;
  memberCount: number;
  perMemberShare: string;
  mealExpense: string;
  mealUnits: string;
  mealRate: string;
  // Contributions less the expenses paid from the fund: every balance added up.
  cashInHand: string;
  // Each accountant's cash at the period's end (the Cash book's figure).
  accountantCash?: { groupMemberId: string; name: string; cash: string }[];
  members: GroupSettlementMemberRow[];
}

// One accountant's (or every accountant's) money in and out, oldest first,
// with the running cash.
export interface GroupCashbookRow {
  id: string;
  // HANDOVER: cash one holder handed to another (two rows, one each side).
  source: "CONTRIBUTION" | "EXPENSE" | "HANDOVER";
  kind: "IN" | "OUT";
  date: string;
  accountantId: string;
  accountantName: string | null;
  // The member it came from or went back to, or the expense's category.
  party: string;
  // A return paid back to a member.
  returned: boolean;
  note: string | null;
  amount: string;
  balance: string;
  // A handover's other holder: who got the cash (OUT) or gave it (IN).
  otherId?: string;
}

export interface GroupCashbook {
  accountants: { groupMemberId: string; name: string; active: boolean; cash: string }[];
  cashHolderMemberId: string | null;
  opening: string;
  closing: string;
  totalIn: string;
  totalOut: string;
  inCount: number;
  outCount: number;
  rows: GroupCashbookRow[];
}

export type GroupActivityAction = "ADDED" | "EDITED" | "DELETED" | "MONTH";

// One line of a group's activity log: what changed, and from what to what.
// The text is built in the reader's language from these.
export interface GroupActivity {
  id: string;
  action: GroupActivityAction;
  // EXPENSE, CONTRIBUTION, SETTLE, HANDOVER, MEMBER, CATEGORY, BUDGET, SETTINGS, SPLIT, MEALS, MONTH
  entity: string;
  entityId: string | null;
  summary: Record<string, unknown>;
  change: { field: string; from: unknown; to: unknown }[] | null;
  // Who made the change (their initials when they hide their name in groups).
  actorName: string | null;
  actorUserId?: string | null;
  createdAt: string;
}

export interface GroupActivityPage {
  data: GroupActivity[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface GroupSettlementRecordMember {
  id: string;
  settlementId: string;
  groupMemberId: string;
  contributed: string;
  pocketPaid: string;
  mealUnits: string;
  mealCost: string;
  share: string;
  balance: string;
  groupMember: GroupMember;
}

export interface GroupSettlementRecord {
  id: string;
  businessId: string;
  periodStart: string;
  periodEnd: string;
  totalExpense: string;
  memberCount: number;
  perMemberShare: string;
  mealExpense: string;
  mealUnits: string;
  mealRate: string;
  cashInHand: string;
  carriedForward: boolean;
  closedBy: string;
  closedAt: string;
  members: GroupSettlementRecordMember[];
}

// A manually-entered budget record (Month + Year + amount, typed in via the
// Dashboard's "Add Month" form on the Monthly Breakdown card), not computed
// from real expense/contribution data. One row per (businessId, month, year).
export interface GroupMonthlyBudget {
  id: string;
  businessId: string;
  month: number; // 1-12
  year: number;
  budgetAmount: string;
  createdAt: string;
  updatedAt: string;
}

// "Habit Tracker" -- a completely separate, personal (User-scoped, not
// Business-scoped) app-mode reached via the TopBar's "Switch" button. See
// backend/src/habits/ and lib/habits.ts/habitsActions.ts.
export type HabitFrequency = "DAILY" | "WEEKLY_DAYS" | "WEEKLY_COUNT";

// Fixed picker list for now (not a user-editable CRUD list like
// GroupExpenseCategoryOption) -- see the backend Habit.category schema
// comment for why the field itself is still a loose string, not an enum.
export const HABIT_CATEGORIES = ["Namaz", "Ramadan", "Book", "Course", "Others"] as const;

// What a category is CALLED on screen. The stored value (Habit.category and the
// ?category= link) keeps its original key -- only the label changed -- so
// habits filed under "Book" / "Course" are untouched.
const HABIT_CATEGORY_LABELS: Record<string, string> = { Book: "My Library", Course: "Skills" };

export function categoryLabel(category: string): string {
  return Object.hasOwn(HABIT_CATEGORY_LABELS, category) ? HABIT_CATEGORY_LABELS[category] : category;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  frequencyType: HabitFrequency;
  // 0=Sunday..6=Saturday -- only meaningful when frequencyType is
  // WEEKLY_DAYS.
  weeklyDays: number[];
  // Only meaningful when frequencyType is WEEKLY_COUNT.
  weeklyCount: number | null;
  targetValue: number | null;
  unit: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  value: number | null;
  note: string | null;
  createdAt: string;
}

// What GET /api/habits/today returns: the habits planned for today, each
// with today's log and the streak counted up to today.
export interface HabitToday extends Habit {
  todayLog: HabitLog | null;
  streak: number;
}

// GET /api/habits/stats: one row per active habit.
export interface HabitStat {
  habitId: string;
  name: string;
  icon: string;
  color: string;
  currentStreak: number;
  // The longest run in the habit's whole history, in currentStreak's unit
  // (days, or weeks for a weekly-count habit); never below currentStreak.
  bestStreak?: number;
  last30DaysCompleted: number;
  // Share of the planned days in the last 30 (null when none were planned);
  // the UI still works its own % out from the month logs.
  completionRate: number | null;
  last30DaysPlanned?: number;
}

// GET /api/habits/month?month=YYYY-MM: every habit (archived too) and the
// month's logs.
export interface HabitMonthLog {
  habitId: string;
  date: string;
  completed: boolean;
  value: number | null;
}

export interface HabitMonth {
  habits: Habit[];
  logs: HabitMonthLog[];
}

// Habit Tracker -> Book: a personal reading list, tracked by pages. `status`
// is settled server-side from pagesRead (BooksService.settle); `finishedYear`
// is the Asia/Dhaka year of finishedAt, so the client never guesses timezones.
export type BookStatus = "WANT_TO_READ" | "READING" | "FINISHED";

export interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  pagesRead: number;
  status: BookStatus;
  color: string; // key into components/habit-tracker/books/bookPalette.ts
  startedAt: string | null;
  finishedAt: string | null;
  finishedYear: number | null;
  // Put down for now while being read (still READING, its page kept).
  pausedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Library › Dashboard: one Asia/Dhaka year of reading, month by month
// (January first), in all and for each book read that year (by id), that
// year's goal, and every year from the first one with reading (newest first).
export interface BookYear {
  year: number;
  goalTarget: number | null;
  years: number[];
  months: number[];
  bookMonths: Record<string, number[]>;
}

// A note on a book, or a line the reader liked, with its page.
export interface BookNote {
  id: string;
  bookId: string;
  page: number | null;
  text: string;
  createdAt: string;
}

// One Asia/Dhaka day of reading, over every book.
export interface ReadingDay {
  date: string; // YYYY-MM-DD
  pages: number;
}

export interface BooksOverview {
  year: number; // the current Asia/Dhaka year
  goalTarget: number | null; // this year's "finish N books" goal
  books: Book[];
  // Days in a row with pages read (up to yesterday while today has none
  // yet), the best run, and this week from the reader's first day (Saturday
  // unless they chose another).
  reading: { streak: number; best: number; week: ReadingDay[] };
  // Pages read today in each book that has any, by book id.
  pagesToday: Record<string, number>;
  // The notes on each book being read, oldest first, by book id.
  notes: Record<string, BookNote[]>;
}

// Habit Tracker -> Skills (the "Course" category): something being learned,
// counted in lessons (a course) or hours (any skill). `target` and `progress`
// are in the skill's unit -- HOURS are MINUTES (the UI shows hours). `status`
// is settled server-side from progress (SkillsService.settle).
export type SkillUnit = "LESSONS" | "HOURS";
export type SkillStatus = "WANT_TO_LEARN" | "LEARNING" | "COMPLETED";

export interface Skill {
  id: string;
  name: string;
  source: string;
  unit: SkillUnit;
  target: number;
  progress: number;
  status: SkillStatus;
  color: string; // key into components/habit-tracker/skills/skillPalette.ts
  icon: string; // same
  startedAt: string | null;
  completedAt: string | null;
  completedYear: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SkillWeekDay {
  date: string; // 'YYYY-MM-DD', Asia/Dhaka
  minutes: number; // learned that day in HOURS skills
  lessons: number; // learned that day in LESSONS skills
  bySkill: Record<string, number>; // that day's amount per skill id, in the skill's unit
}

export interface SkillsOverview {
  year: number; // the current Asia/Dhaka year
  goalTarget: number | null; // this year's "complete N skills" goal
  streak: number; // consecutive days with activity, up to today
  week: SkillWeekDay[]; // the last 7 days, oldest first, ending today
  skills: Skill[];
}

// One month sheet (Namaz), one Ramadan, or one named challenge ("Others" --
// see backend HabitTrackersService). `checks` lists only the TICKED cells.
// `elapsedDays` (server-computed, Asia/Dhaka) is how many days of that month
// are fully past -- the Cross total is derived from it client-side, since an
// unticked cell today or later isn't a miss yet. A Ramadan or Others
// challenge has no calendar dates, so its `elapsedDays` is 0, `todayDay`
// null, and `month`/`year` null (Others also carries a free-form `name`,
// null for Namaz/Ramadan).
// How a prayer was prayed; MISSED is an explicit "not prayed".
export type PrayerStatus = "JAMAAT" | "ON_TIME" | "QAZA" | "MISSED";

// The qaza a person owes (GET /api/namaz/qaza): prayers missed on their
// Namaz sheets since the counting day, less the ones made up.
export interface QazaSummary {
  since: string;
  missed: Record<string, number>;
  madeUp: Record<string, number>;
  left: Record<string, number>;
  totalLeft: number;
  recent: { id: string; prayer: string; count: number; date: string }[];
}

export interface HabitMonthTracker {
  id: string;
  category: string;
  month: number | null; // 1-12 (a Ramadan is always 9), null for Others
  year: number | null;
  name: string | null; // Others only
  items: string[];
  totalDays: number;
  elapsedDays: number;
  // Day-of-month that is "today" (Asia/Dhaka, server-side) when this is the
  // current month, else null -- the sheet highlights that column.
  todayDay: number | null;
  // status only means something on a Namaz sheet (Ramadan and challenge
  // ticks are always ON_TIME).
  checks: { day: number; item: string; status: PrayerStatus }[];
  // Ramadan only (empty elsewhere): the paras of the Quran read each day, by
  // day. A day with none is left out.
  paras: { day: number; paras: number }[];
  // When the sheet was created: a challenge counts its days from here.
  createdAt: string;
  // Ramadan only: the missed fasts made up since ("I kept one").
  fastsMadeUp?: number;
  // Challenges only: the date day 1 falls on ("YYYY-MM-DD"), and the day it
  // was ended early (null while it runs its course).
  startsOn?: string | null;
  endedOnDay?: number | null;
  // Namaz only: the share of the month's prayers aimed for (1-100), or null.
  goalPct?: number | null;
}

// Ramadan › Today's "Get ready" steps ticked for one Ramadan (year: the
// Gregorian year it begins in, as its sheet is keyed).
export type RamadanPrepKey = "intention" | "makeUp" | "quran" | "sadaqah" | "tahajjud";
export interface RamadanPrep {
  year: number;
  items: RamadanPrepKey[];
}

// Habit Tracker -> To Do List: one list per calendar date, holding any number
// of check-off tasks, and one dateless list for Someday. Unlike the trackers
// above, a list has no calendar grid and no protected-history delete rule --
// see backend TodosService.
export type TodoPriority = "HIGH" | "MEDIUM" | "LOW";
export type TodoRepeatKind = "DAILY" | "WEEKLY" | "MONTHLY";

// How a task repeats: every day, on certain weekdays (0 = Sunday), or once
// a month on monthDay.
export interface TodoRepeatRule {
  id: string;
  kind: TodoRepeatKind;
  weekdays: number[];
  monthDay: number | null;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: TodoPriority;
  // "HH:MM" on a 24-hour clock, or null for any time that day.
  dueTime: string | null;
  // Minutes before dueTime to be reminded (0 = at the time); null or absent
  // = no reminder. Only meaningful with a dueTime.
  remindBefore?: number | null;
  // "YYYY-MM-DD" the task was first planned for, once it was put off.
  movedFrom: string | null;
  // How many times it was put off to a later day.
  moveCount: number;
  // When it was ticked off (ISO); null while open.
  completedAt: string | null;
  // The list (TodoCategory) it is filed under; null = Personal.
  categoryId: string | null;
  note: string;
  steps: TodoStep[];
  repeat: TodoRepeatRule | null;
}

// One of a task's smaller steps.
export interface TodoStep {
  text: string;
  done: boolean;
}

// A To Do "list" a task is filed under: the built-in Personal, Work, Home
// and Deen (key set, names translated by the app) or one the person added.
export type TodoColor = "blue" | "violet" | "orange" | "green" | "pink" | "teal" | "yellow" | "indigo" | "emerald" | "purple";
export interface TodoCategory {
  id: string;
  key: "personal" | "work" | "home" | "deen" | null;
  name: string;
  color: TodoColor;
}

// A repeating task still going, for the board's "Repeating tasks" card.
export interface TodoRepeat extends TodoRepeatRule {
  text: string;
  priority: TodoPriority;
  dueTime: string | null;
  remindBefore?: number | null;
  categoryId?: string | null;
  startsOn: string;
}

export interface TodoList {
  id: string;
  // "YYYY-MM-DD", or null on the Someday list.
  date: string | null;
  items: TodoItem[];
}

// Habit Tracker > Write (backend src/writing): notes and the journal.
// Personal, like the rest of the Habit Tracker (no :businessId).
export type NoteKind = "NOTE" | "IDEA";
export type NoteColor = "white" | "yellow" | "green" | "blue" | "pink" | "purple";
export type NoteCategoryColor = "blue" | "rose" | "amber" | "violet" | "teal" | "green" | "slate";

export interface Note {
  id: string;
  kind: NoteKind;
  title: string;
  body: string;
  categoryId: string | null;
  tags: string[];
  color: NoteColor;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteCategory {
  id: string;
  name: string;
  color: NoteCategoryColor;
}

export interface NotesOverview {
  notes: Note[];
  categories: NoteCategory[];
}

export type JournalKind = "DAILY" | "DIARY";

export interface JournalEntry {
  date: string; // "YYYY-MM-DD"
  kind: JournalKind;
  // 0 Great, 1 Good, 2 Okay, 3 Low, 4 Hard.
  mood: number;
  wentWell: string;
  gratefulFor: string;
  tomorrow: string;
  body: string;
  categoryId: string | null;
  tags: string[];
  isPrivate: boolean;
  locked: false;
  updatedAt: string;
}

// A private entry while the diary is locked: only that the day has one.
export interface LockedJournalEntry {
  date: string;
  isPrivate: true;
  locked: true;
}

export interface JournalMonth {
  month: string; // "YYYY-MM"
  today: string;
  pinSet: boolean;
  unlocked: boolean;
  streak: number;
  total: number;
  entries: (JournalEntry | LockedJournalEntry)[];
}

export interface JournalSummary {
  today: { written: boolean; mood: number | null };
  streak: number;
  latestNote: { id: string; kind: NoteKind; title: string; body: string } | null;
}
