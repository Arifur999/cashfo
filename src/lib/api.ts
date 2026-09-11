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
  account?: { id: string; name: string; accountType: AccountType };
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
