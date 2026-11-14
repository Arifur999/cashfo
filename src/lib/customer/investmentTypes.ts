// The Investments API's shapes (api/businesses/:id/investments). Money comes
// as decimal strings, days as ISO timestamps at UTC midnight.

export type InvestmentKind = "BUSINESS" | "SANCHAYAPATRA" | "FDR" | "SHARES" | "PROPERTY" | "OTHER";
export type InvestmentFrequency = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "IRREGULAR";
export type InvestmentPayoutMode = "FIXED" | "RATE" | "NONE";
export type InvestmentEntryType = "INVEST" | "ADD" | "PROFIT" | "BACK" | "LOSS";

export interface InvestmentEntry {
  id: string;
  investmentId: string;
  type: InvestmentEntryType;
  date: string;
  amount: string;
  // The wallet the money left or came into; null for a loss and for money
  // put in earlier (no money moved).
  accountId: string | null;
  transactionId: string | null;
  note: string | null;
  fromClose: boolean;
  createdAt: string;
}

export interface Investment {
  id: string;
  name: string;
  kind: InvestmentKind;
  startDate: string;
  frequency: InvestmentFrequency;
  payoutMode: InvestmentPayoutMode;
  fixedAmount: string | null;
  ratePercent: string | null;
  firstDueDate: string | null;
  maturityDate: string | null;
  profitAccountId: string | null;
  note: string | null;
  closedAt: string | null;
  createdAt: string;
  entries: InvestmentEntry[];
  // What the entries add up to.
  put: string;
  back: string;
  loss: string;
  profit: string;
  capital: string;
}

// New investment and Edit investment.
export interface InvestmentInput {
  name: string;
  kind: InvestmentKind;
  amount: number;
  startDate: string;
  // null: put in earlier, no account changes.
  sourceAccountId: string | null;
  frequency: InvestmentFrequency;
  payoutMode: InvestmentPayoutMode;
  fixedAmount: number | null;
  ratePercent: number | null;
  firstDueDate: string | null;
  maturityDate: string | null;
  profitAccountId: string;
  note: string | null;
}

export type NewEntryType = Exclude<InvestmentEntryType, "INVEST">;

export interface EntryInput {
  type: NewEntryType;
  amount: number;
  date: string;
  accountId?: string;
  note?: string;
}

export interface EntryEditInput {
  amount: number;
  date: string;
  accountId?: string;
  note?: string;
}

export interface CloseInput {
  amount: number;
  date: string;
  accountId?: string;
  note?: string;
}
