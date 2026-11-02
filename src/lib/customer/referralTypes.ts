// The Referral Program's shapes (GET /api/referrals and its pages: referred
// users, earnings, withdrawals, invite links, profile & payouts). Money is a
// 2-decimal string ("343.80"), dates ISO strings.

export type PayoutMethodType = "BKASH" | "NAGAD" | "ROCKET" | "BANK";
export type BankAccountType = "SAVINGS" | "CURRENT";
export type PayoutStatus = "REQUESTED" | "APPROVED" | "PAID" | "REJECTED" | "CANCELLED";
// FREE_PLAN: the member is on the Free plan and the program pays paid
// members only. PROGRAM_OFF: the admin paused the program (new earning
// stops; earned money can still be withdrawn).
export type LockedReason = "FREE_PLAN" | "PROGRAM_OFF";

// Where a commission line is: inside the refund window, ready, in a
// request, held back by an admin for a check, paid, taken back because the
// friend was refunded, or never earned / cancelled (cancelReason says why).
export type CommissionStatus = "ON_HOLD" | "AVAILABLE" | "IN_WITHDRAWAL" | "UNDER_CHECK" | "PAID_OUT" | "REVERSED" | "CANCELLED";
// FIRST = the friend's first payment, RENEWAL = a later one, BONUS = an old
// flat sign-up bonus.
export type CommissionKind = "FIRST" | "RENEWAL" | "BONUS";
// How an invited friend stands; ENDED is the "Stopped or refunded" tab.
export type FriendStanding = "PAYING" | "FREE" | "STOPPED" | "REFUNDED" | "BLOCKED";
export type FriendFilter = FriendStanding | "ENDED";

export interface PlanExample {
  planId: string;
  planName: string;
  billingCycle?: string;
  price: string;
  friendPays: string;
  youEarn: string;
  // A renewal is at full price.
  youEarnRenewal?: string;
}

export interface ReferralProgram {
  live: boolean;
  whoCanEarn: "PAID_PLAN" | "EVERYONE";
  commissionPct: number;
  friendDiscountPct: number;
  holdDays: number;
  minWithdrawal: string;
  fee: string;
  payWithinDays: number;
  methods: PayoutMethodType[];
  examples: PlanExample[];
}

export interface ReferralBalances {
  available: string;
  onHold: string;
  onHoldNextAt: string | null;
  inWithdrawal: string;
  underCheck: string;
  paidOut: string;
  reversed: string;
  lifetime: string;
  lastPaidAt: string | null;
}

// One commission line: a friend's payment and the member's share of it.
export interface Earning {
  id: string;
  referralId: string;
  friendName: string;
  kind: CommissionKind;
  planName: string | null;
  paidAt: string;
  // "PAY-4QK2T8AB"; null for an old bonus.
  paymentDisplayId: string | null;
  paidAmount: string;
  rate: number;
  amount: string;
  status: CommissionStatus;
  availableAt: string;
  // FRIEND_REFUNDED | REFERRER_NOT_ON_PAID_PLAN | PROGRAM_OFF | ADMIN
  cancelReason: string | null;
  paidOutAt: string | null;
  endedAt: string | null;
  payout: { id: string; displayId: string; status: PayoutStatus } | null;
}

// GET /api/referrals: Referrals > Dashboard.
export interface ReferralProgramInfo {
  referralCode: string;
  // The name friends see on the invite.
  inviteName?: string;
  canEarn: boolean;
  lockedReason: LockedReason | null;
  myPlan: { planId: string; planName: string; status: string; isPaid: boolean };
  program: ReferralProgram;
  balances: ReferralBalances;
  lastPayout: { id: string; amount: string | null; methodType: PayoutMethodType; paidAt: string | null } | null;
  // Every invite link, the main one too.
  linkCount: number;
  // The last twelve months, oldest first ("2026-10").
  months: { month: string; amount: string }[];
  people: { total: number } & Record<FriendStanding, number>;
  // What paying friends' renewals in the next 30 days should earn.
  expectedNext30Days: string;
  expectedRenewals: number;
  firstEarnedAt: string | null;
  topFriends: { referralId: string; name: string; earned: string }[];
  latest: Earning[];
}

export interface EarningList {
  data: Earning[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  // By status, with the month and search applied.
  totals: Record<CommissionStatus, { count: number; amount: string }>;
}

export interface FriendRow {
  id: string;
  name: string;
  joinedAt: string;
  // The invite link they came through; null = the main link.
  link: { id: string; label: string; tag: string } | null;
  standing: FriendStanding;
  blockedReason: string | null;
  planName: string | null;
  nextPaymentAt: string | null;
  paid: string;
  earned: string;
  canRemind: boolean;
}

export interface FriendList {
  data: FriendRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  counts: { ALL: number } & Record<FriendStanding, number>;
}

export interface FriendDetail extends FriendRow {
  // Every payment and the member's share, newest first.
  payments: Earning[];
}

export interface ReferralLink {
  id: string;
  label: string;
  tag: string;
  main: boolean;
  clicks: number;
  joined: number;
  paying: number;
  earned: string;
  createdAt: string;
}

export interface ReferralProfile {
  name: string;
  referralCode: string;
  // When their first friend signed up.
  referringSince: string | null;
  referralName: string | null;
  inviteName: string;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  emailEarned: boolean;
  emailPayouts: boolean;
}

export interface PayoutMethod {
  id: string;
  type: PayoutMethodType;
  accountName: string;
  walletNumber: string | null;
  bankName: string | null;
  branch: string | null;
  bankAccountType: BankAccountType | null;
  accountNumber: string | null;
  routingNumber: string | null;
  isDefault: boolean;
  // The name on the account matches the member's own (a soft check).
  nameMatches: boolean;
  // The newest request sent here, when it was rejected.
  lastRejection: { at: string | null; reason: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutMethodInput {
  type: PayoutMethodType;
  accountName: string;
  walletNumber?: string | null;
  bankName?: string | null;
  branch?: string | null;
  bankAccountType?: BankAccountType | null;
  accountNumber?: string | null;
  routingNumber?: string | null;
  isDefault?: boolean;
}

// The method as it was when the request was made.
export type MethodSnapshot = Pick<PayoutMethod, "type" | "accountName" | "walletNumber" | "bankName" | "branch" | "bankAccountType" | "accountNumber" | "routingNumber">;

// A line as a request lists it.
export interface PayoutLine {
  id: string;
  friendName: string;
  kind: CommissionKind;
  planName: string | null;
  paidAt: string;
  paidAmount: string;
  amount: string;
  status: CommissionStatus;
}

export interface PayoutRequest {
  id: string;
  // "WD-1048"
  displayId: string;
  number: number;
  amount: string;
  // What was asked for, before an admin held any line back.
  requestedAmount: string;
  fee: string;
  receiveAmount: string;
  status: PayoutStatus;
  method: MethodSnapshot;
  methodId: string | null;
  createdAt: string;
  // "YYYY-MM-DD", counting working days (Sunday to Thursday).
  expectedBy: string;
  approvedAt: string | null;
  paidAt: string | null;
  paidAmount: string | null;
  trxId: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
  cancelledAt: string | null;
  canCancel: boolean;
  // The lines it was made of; UNDER_CHECK ones were held back.
  lines: PayoutLine[];
  income: { businessId: string | null; accountId: string; accountName: string | null; businessName: string | null; transactionId: string | null } | null;
}

export interface WithdrawalList {
  data: PayoutRequest[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  // Being checked (requested or approved); taken by paid requests; what was sent.
  totals: { askedFor: string; paidOut: string; received: string };
}

// The code's challenge (POST /api/referrals/withdrawals/start).
export interface WithdrawalChallenge {
  challengeId: string;
  channel: "EMAIL" | "SMS";
  // "t***@example.com" or "01711-•••915"
  sentTo: string;
  resendAfterSec: number;
  expiresAt: string;
  attemptsLeft: number;
  sendsLeft: number;
}

export interface StartWithdrawalInput {
  commissionIds: string[];
  methodId: string;
  income?: { businessId: string; accountId: string };
}

// GET /api/referrals/invite/:code (no sign-in): who invited the visitor.
export interface ReferralInvite {
  valid: boolean;
  referrerFirstName: string | null;
  referrerName: string | null;
  friendDiscountPct: number;
  programLive: boolean;
}
