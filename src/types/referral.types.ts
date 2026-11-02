// Admin > Referrals & Payouts (backend admin/referrals). Money arrives as
// fixed-2dp strings ("540.00"); dates as ISO strings.

export const PAYOUT_STATUSES = ["REQUESTED", "APPROVED", "PAID", "REJECTED", "CANCELLED"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const PAYOUT_METHOD_TYPES = ["BKASH", "NAGAD", "ROCKET", "BANK"] as const;
export type PayoutMethodType = (typeof PAYOUT_METHOD_TYPES)[number];

// Where the member asked for the money: a copy of the payout method taken
// when the request was made.
export interface IPayoutMethodSnapshot {
  type: PayoutMethodType;
  accountName: string;
  walletNumber: string | null;
  bankName: string | null;
  branch: string | null;
  bankAccountType: "SAVINGS" | "CURRENT" | null;
  accountNumber: string | null;
  routingNumber: string | null;
}

export type PayoutCheckKey = "NAME_MATCHES" | "CODE_CONFIRMED" | "HOLDS_OVER" | "NO_REFUNDS" | "FRIEND_PAID_FROM_THIS_NUMBER" | "WRONG_NUMBER_FOR_METHOD";

// What the desk checks on a request; ok = false is a warning, never a block.
export interface IPayoutCheck {
  key: PayoutCheckKey;
  ok: boolean;
  detail: string | null;
}

export interface IPayoutRow {
  id: string;
  // "WD-1048"
  displayId: string;
  number: number;
  createdAt: string;
  user: { id: string; name: string; email: string };
  // The member's first request: worth a closer look ("NEW").
  isFirst: boolean;
  // "6 friend payments" (from this many friends).
  lineCount: number;
  friendCount: number;
  // The lines' total less any held back at approval; what was asked for.
  amount: string;
  requestedAmount: string;
  fee: string;
  // What the admin sends: the amount less the fee.
  sendAmount: string;
  method: IPayoutMethodSnapshot;
  methodId: string | null;
  checks: IPayoutCheck[];
  status: PayoutStatus;
  statusAt: string;
  codeConfirmedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  paidAmount: string | null;
  trxId: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
  cancelledAt: string | null;
  // The member asked for the money to be booked as income in a wallet.
  incomeRequested: boolean;
  incomeTransactionId: string | null;
}

export const COMMISSION_STATUSES = ["ON_HOLD", "AVAILABLE", "IN_WITHDRAWAL", "UNDER_CHECK", "PAID_OUT", "REVERSED", "CANCELLED"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];
export type CommissionKind = "FIRST" | "RENEWAL" | "BONUS";

// Did the friend's payment reach us: it stands, it was refunded since, or
// there is no payment to check (an old bonus).
export type LineReached = "RECEIVED" | "REFUNDED" | "UNKNOWN";

// One friend payment in a request, as the desk checks it.
export interface IPayoutLine {
  id: string;
  status: CommissionStatus;
  kind: CommissionKind;
  friend: { id: string; name: string; email: string; phone: string | null };
  payment: { id: string; displayId: string; planName: string; paidAt: string | null; status: string; gateway: string; reference: string | null; payerAccount: string | null } | null;
  reached: LineReached;
  paidAmount: string | null;
  rate: number;
  amount: string | null;
  availableAt: string;
  // The friend paid from the member's own phone number.
  paidFromMemberNumber: boolean;
}

export interface IPayoutDetail extends IPayoutRow {
  user: { id: string; name: string; email: string; phone: string | null };
  approvedByName: string | null;
  processedByName: string | null;
  income: { businessId: string | null; businessName: string | null; accountId: string; accountName: string | null; transactionId: string | null } | null;
  // About the member: referring since, how many people, paid before.
  member: { since: string | null; referred: number; paidBefore: string | null };
  // Every friend payment in it (UNDER_CHECK ones held back at approval).
  lines: IPayoutLine[];
  // Due by this date (yyyy-MM-dd, working days Sunday to Thursday).
  expectedBy: string;
}

export type PayoutStatusCounts = Record<"ALL" | PayoutStatus, number>;

// Admin > Referrals & Payouts > Referrals: every commission line.
export interface IAdminCommissionRow {
  id: string;
  referrer: { id: string; name: string; email: string };
  friend: { id: string; name: string; email: string };
  kind: CommissionKind;
  status: CommissionStatus;
  payment: { id: string; displayId: string; planName: string; status: string; paidAt: string | null; gateway: string; reference: string | null } | null;
  paidAmount: string | null;
  rate: number;
  amount: string | null;
  availableAt: string;
  payout: { id: string; displayId: string; status: PayoutStatus } | null;
  // FRIEND_REFUNDED | REFERRER_NOT_ON_PAID_PLAN | PROGRAM_OFF | ADMIN
  cancelReason: string | null;
  paidOutAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export type CommissionStatusCounts = Record<"ALL" | CommissionStatus, number>;

export type WhoCanEarn = "PAID_PLAN" | "EVERYONE";

export interface IReferralSettings {
  programLive: boolean;
  whoCanEarn: WhoCanEarn;
  commissionPct: number;
  friendDiscountPct: number;
  holdDays: number;
  // Whole taka.
  minWithdrawal: number;
  withdrawalFee: number;
  payWithinDays: number;
  payoutMethods: PayoutMethodType[];
  blockSelf: boolean;
  cancelOnRefund: boolean;
  flagSameNumber: boolean;
  // null = no limit.
  maxPerMonth: number | null;
  lastChange: { at: string; by: string | null } | null;
}

export type IReferralSettingsPayload = Partial<Omit<IReferralSettings, "lastChange">>;

export interface IMarkPayoutPaidPayload {
  trxId: string;
  paidAt?: string;
  paidAmount?: number;
  notifyUser?: boolean;
  note?: string;
}
