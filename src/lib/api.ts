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
  trialEndsAt: string | null;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  preferredLanguage: LanguagePreference;
  emailVerifiedAt: string | null;
  businesses: UserBusiness[];
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
export type VaultEntryCategory = "SOCIAL" | "BANK" | "EMAIL" | "SHOPPING" | "WORK" | "OTHER";

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
  createdAt: string;
  updatedAt: string;
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
  runningBalance: string;
}

export interface AccountLedger {
  accountId: string;
  accountName: string;
  openingBalance: string;
  balanceBroughtForward: string;
  entries: LedgerRow[];
  closingBalance: string;
  meta: { page: number; limit: number; total: number; totalPages: number };
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

export interface GeneralLedgerAccount {
  id: string;
  name: string;
  nameBn: string | null;
  accountSubtype: string | null;
  currentBalance: string;
  isSystemAccount: boolean;
  status: AccountStatus;
}

export interface GeneralLedgerGroup {
  accountType: AccountType;
  accounts: GeneralLedgerAccount[];
}

export interface GeneralLedgerResponse {
  groups: GeneralLedgerGroup[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface TrialBalanceRow {
  accountId: string;
  name: string;
  nameBn: string | null;
  accountType: AccountType;
  status: AccountStatus;
  debit: string;
  credit: string;
}

export interface TrialBalanceResponse {
  rows: TrialBalanceRow[];
  totalDebit: string;
  totalCredit: string;
  isBalanced: boolean;
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
}

export interface CategoryBreakdown {
  type: "INCOME" | "EXPENSE";
  total: string;
  categories: CategoryBreakdownRow[];
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
  account?: { id: string; name: string; accountType: AccountType; accountSubtype: string | null };
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
  entries: TransactionEntry[];
}

export interface TransactionListResponse {
  data: Transaction[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export type ContactType = "CUSTOMER" | "SUPPLIER" | "BOTH" | "RELATIVE" | "OTHER";
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
  remaining: string;
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

export type LoanBalanceDirection = "DENA" | "PAWNA" | "SETTLED";

export interface LoanDashboardRow {
  contactId: string;
  contactName: string;
  contactPhone: string | null;
  openingBalance: string;
  totalReceive: string;
  totalPayment: string;
  currentBalance: string;
  direction: LoanBalanceDirection;
}

export interface LoanDashboard {
  totalDena: string;
  totalPawna: string;
  totalPaid: string;
  totalReceived: string;
  netBalance: string;
  activeAccounts: number;
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
  runningPrincipal: string;
  status: TransactionStatus;
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

// Savings Goals (/savings-goals/*): a named target funded by real
// contributions from a money account, landing in one of the business's own
// Savings Wallets (an Account, accountSubtype "savings" -- see
// AccountsService.listSavingsWallets()'s comment; managed at
// /savings-goals/wallet, same CRUD as Balance's own Wallet page).
// currentAmount/progressPercent/monthlyTarget are computed on read, never
// stored.
export type SavingsGoalStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "WITHDRAWN";
export type SavingsReminderChannel = "EMAIL" | "PHONE";
export type SavingsEntryType = "CONTRIBUTION" | "TRANSFER_OUT" | "TRANSFER_IN" | "WITHDRAWAL";
// Only ever set for an ACTIVE goal -- null for Paused/Completed/Withdrawn,
// where "are you saving fast enough" no longer applies. See
// SavingsGoalsService.computePaceStatus()/computeTrend()'s comments for
// exactly how each is derived.
export type SavingsGoalPaceStatus = "ON_TRACK" | "BEHIND" | "WARNING" | null;
export type SavingsGoalTrend = "INCREASING" | "DECREASING" | "STABLE" | null;

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
}

export interface SavingsGoalEntry {
  id: string;
  type: SavingsEntryType;
  amount: string;
  date: string;
  moneyAccountName: string | null;
  savingsAccountName: string | null;
  relatedGoalName: string | null;
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
  purchaseAccountId: string;
  status: AssetStatus;
  // Only set once sellAssetAction() has run -- an ACTIVE asset carries all
  // three as null.
  soldAt: string | null;
  soldPrice: string | null;
  soldAccountId: string | null;
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

// "Referral Program" menu -- referralCode is this user's own shareable
// code (the frontend builds the actual share link as
// `${origin}/register?ref=${code}`); status PENDING means the referred
// friend hasn't been registered 30 days yet (see backend
// ReferralsService's comment), CONFIRMED means it's counted in
// availableBalance and withdrawable, WITHDRAWN means it's already been
// cashed out.
export type ReferralStatus = "PENDING" | "CONFIRMED" | "WITHDRAWN";

export interface ReferralEntry {
  id: string;
  name: string;
  status: ReferralStatus;
  rewardAmount: string;
  createdAt: string;
}

export interface ReferralInfo {
  referralCode: string;
  totalEarned: string;
  pendingEarnings: string;
  availableBalance: string;
  referralCount: number;
  rewardAmountPerReferral: string;
  recentReferrals: ReferralEntry[];
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

export interface GroupExpenseCategoryOption {
  id: string;
  businessId: string;
  name: string;
  icon: string | null;
  color: string;
  displayOrder: number;
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
  createdAt: string;
  updatedAt: string;
}

export interface GroupContribution {
  id: string;
  businessId: string;
  groupMemberId: string;
  amount: string;
  date: string;
  note: string | null;
  createdAt: string;
  groupMember: GroupMember;
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
  createdAt: string;
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
  share: string;
  balance: string;
}

export interface GroupSettlementResult {
  periodStart: string;
  periodEnd: string;
  totalExpense: string;
  memberCount: number;
  perMemberShare: string;
  members: GroupSettlementMemberRow[];
}

export interface GroupSettlementRecordMember {
  id: string;
  settlementId: string;
  groupMemberId: string;
  contributed: string;
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

// GET /api/habits/today's shape -- a Habit plus whatever's already known
// about it for today, so the Dashboard checklist doesn't need a second
// round trip per habit.
export interface HabitToday extends Habit {
  todayLog: HabitLog | null;
  streak: number;
}

export interface HabitMonthLogs {
  habits: Habit[];
  logs: Pick<HabitLog, "habitId" | "date" | "completed" | "value">[];
}

export interface HabitStat {
  habitId: string;
  name: string;
  icon: string;
  color: string;
  currentStreak: number;
  last30DaysCompleted: number;
  completionRate: number;
}
