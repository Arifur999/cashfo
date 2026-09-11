// Server-side only -- there is no NEXT_PUBLIC_ prefix here on purpose. The
// browser never talks to the backend directly; it always goes through this
// Next.js server (Server Actions / proxy), same boundary as admin-frontend.
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:5000";

export type LanguagePreference = "EN" | "BN";
export type WorkspaceType = "PERSONAL" | "BUSINESS";
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
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  preferredLanguage: LanguagePreference;
  emailVerifiedAt: string | null;
  businesses: UserBusiness[];
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
  planId: string | null;
  createdAt: string;
  updatedAt: string;
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

export type ContactType = "CUSTOMER" | "SUPPLIER" | "BOTH";
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
