// The Referral Program's commission and payout shapes (GET /api/referrals
// and the payout-method, withdrawal and invite routes). The older fields
// live on ReferralInfo in api.ts; this file adds what the program brought.
// Money is a 2-decimal string ("540.00"), dates ISO strings.
import type { ReferralInfo } from "./api";

export type FriendStatus = "JOINED" | "PENDING" | "AVAILABLE" | "PAID_OUT" | "CANCELLED";
// Which "Friends who joined" tab a friend falls under; OTHER is an old
// sign-up bonus, or a sign-up that didn't count.
export type FriendFilterKey = "BOUGHT" | "NOT_YET" | "REFUNDED" | "OTHER";
export type ReferralKind = "SIGNUP_BONUS" | "COMMISSION";
export type PayoutMethodType = "BKASH" | "NAGAD" | "ROCKET" | "BANK";
export type BankAccountType = "SAVINGS" | "CURRENT";
export type PayoutStatus = "REQUESTED" | "APPROVED" | "PAID" | "REJECTED" | "CANCELLED";
// FREE_PLAN: the member is on the Free plan and the program pays paid
// members only. PROGRAM_OFF: the admin paused the program (new earning
// stops; earned money can still be withdrawn).
export type LockedReason = "FREE_PLAN" | "PROGRAM_OFF";

export interface ReferralFriend {
  id: string;
  name: string;
  joinedAt: string;
  kind: ReferralKind;
  status: FriendStatus;
  filter: FriendFilterKey;
  // The plan the friend first bought, and the one they are on now.
  planName: string | null;
  currentPlanName: string | null;
  boughtAt: string | null;
  paidAmount: string | null;
  // null while the friend hasn't bought.
  commissionAmount: string | null;
  paidOutAmount: string;
  availableAt: string | null;
  // FRIEND_REFUNDED | REFERRER_NOT_ON_PAID_PLAN | PROGRAM_OFF | SELF_REFERRAL | MONTHLY_LIMIT | ADMIN
  cancelReason: string | null;
  cancelledAt: string | null;
  paidOutAt: string | null;
  refunded: boolean;
}

export interface PlanExample {
  planId: string;
  planName: string;
  price: string;
  friendPays: string;
  youEarn: string;
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
  // Open requests already taken off.
  available: string;
  reserved: string;
  pending: string;
  pendingNextAt: string | null;
  totalEarned: string;
  paidOut: string;
  lastPaidAt: string | null;
}

// What GET /api/referrals answers now. An older backend sends only the
// ReferralInfo part, so each addition is optional and the page falls back.
export interface ReferralProgramInfo extends ReferralInfo {
  canEarn?: boolean;
  lockedReason?: LockedReason | null;
  myPlan?: { planId: string; planName: string; status: string; isPaid: boolean };
  program?: ReferralProgram;
  balances?: ReferralBalances;
  lastPayout?: { id: string; amount: string | null; methodType: PayoutMethodType; paidAt: string | null } | null;
  friends?: ReferralFriend[];
  friendCounts?: { all: number; bought: number; notYet: number; refunded: number };
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

export interface PayoutRequest {
  id: string;
  // "WD-1048"
  displayId: string;
  number: number;
  amount: string;
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
  income: { businessId: string | null; accountId: string; accountName: string | null; businessName: string | null; transactionId: string | null } | null;
}

export interface WithdrawalList {
  data: PayoutRequest[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  // Waiting to be paid; taken by paid requests; what was sent.
  totals: { askedFor: string; paidOut: string; received: string };
}

// The emailed code's challenge (POST /api/referrals/withdrawals/start).
export interface WithdrawalChallenge {
  challengeId: string;
  channel: "EMAIL" | "SMS";
  // "t***@example.com"
  sentTo: string;
  resendAfterSec: number;
  expiresAt: string;
  attemptsLeft: number;
  sendsLeft: number;
}

export interface StartWithdrawalInput {
  amount: number;
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
