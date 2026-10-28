// Admin > Referrals & Payouts (backend admin/referrals). Money arrives as
// fixed-2dp strings ("540.00"); dates as ISO strings.

export const PAYOUT_STATUSES = ["REQUESTED", "APPROVED", "PAID", "REJECTED", "CANCELLED"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const PAYOUT_METHOD_TYPES = ["BKASH", "NAGAD", "ROCKET", "BANK"] as const;
export type PayoutMethodType = (typeof PAYOUT_METHOD_TYPES)[number];

export const REFERRAL_STATUSES = ["JOINED", "PENDING", "AVAILABLE", "PAID_OUT", "CANCELLED"] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export type ReferralKind = "SIGNUP_BONUS" | "COMMISSION";

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

export type PayoutCheckKey = "NAME_MATCHES" | "CODE_CONFIRMED" | "NO_REFUNDS" | "FRIEND_PAID_FROM_THIS_NUMBER" | "WRONG_NUMBER_FOR_METHOD";

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
  // Friends of the member who paid for a plan.
  payingFriends: number;
  amount: string;
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

// One commission behind a request.
export interface IPayoutOwedPart {
  referralId: string;
  friend: { id: string; name: string } | null;
  kind: ReferralKind | null;
  planName: string | null;
  paidAmount: string | null;
  commissionAmount: string | null;
  // The share of this request it covers.
  amount: string;
  availableAt: string | null;
  pastWindow: boolean;
  refunded: boolean;
}

export interface IPayoutDetail extends IPayoutRow {
  user: { id: string; name: string; email: string; phone: string | null };
  approvedByName: string | null;
  processedByName: string | null;
  income: { businessId: string | null; businessName: string | null; accountId: string; accountName: string | null; transactionId: string | null } | null;
  // Due by this date (yyyy-MM-dd, working days Sunday to Thursday).
  expectedBy: string;
  owedBecause: IPayoutOwedPart[];
}

export type PayoutStatusCounts = Record<"ALL" | PayoutStatus, number>;

export interface IAdminReferralRow {
  id: string;
  referrer: { id: string; name: string; email: string };
  friend: { id: string; name: string; email: string };
  joinedAt: string;
  kind: ReferralKind;
  status: ReferralStatus;
  payment: { id: string; displayId: string; planName: string; amount: string | null; status: string; paidAt: string | null; payerAccount: string | null } | null;
  paidAmount: string | null;
  commissionRate: number | null;
  commissionAmount: string;
  availableAt: string | null;
  paidOutAmount: string | null;
  paidOutAt: string | null;
  // FRIEND_REFUNDED, ADMIN, ...
  cancelReason: string | null;
  cancelledAt: string | null;
}

export type ReferralStatusCounts = Record<"ALL" | ReferralStatus, number>;

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
