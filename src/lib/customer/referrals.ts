// Server-only readers for the Referral Program pages; an outage reaches the
// error screen (see readFallback.ts). Client components use
// referralActions.ts.
import "server-only";
import { cache } from "react";
import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "./api";
import { customerApi } from "./apiClient";
import { emptyUnlessOutage } from "./readFallback";
import type { Earning, EarningList, FriendFilter, FriendList, PayoutMethod, ReferralInvite, ReferralLink, ReferralProfile, ReferralProgramInfo, WithdrawalList, ProfileReferral } from "./referralTypes";

// How many rows a page of each list shows.
export const WITHDRAWALS_PAGE_SIZE = 10;
export const FRIENDS_PAGE_SIZE = 20;
export const EARNINGS_PAGE_SIZE = 20;

// GET with the outage rule; a 4xx reads as `empty`.
async function read<T>(path: string, empty: T, params?: Record<string, string | number | undefined>): Promise<T> {
  try {
    const response = await customerApi.get<T>(path, params ? { params } : undefined);
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, empty);
  }
}

export const getReferralInfo = cache(() => read<ReferralProgramInfo | null>("/api/referrals", null));

// Where the member's money can be sent.
export const getPayoutMethods = cache(async (): Promise<PayoutMethod[]> => {
  const methods = await read<PayoutMethod[]>("/api/referrals/payout-methods", []);
  return Array.isArray(methods) ? methods : [];
});

export const getWithdrawals = cache((page: number = 1) => read<WithdrawalList | null>("/api/referrals/withdrawals", null, { page, limit: WITHDRAWALS_PAGE_SIZE }));

export const getReferredFriends = cache((page: number, standing: FriendFilter | undefined, search: string | undefined) =>
  read<FriendList | null>("/api/referrals/friends", null, { page, limit: FRIENDS_PAGE_SIZE, standing, search: search || undefined }),
);

export const getEarnings = cache((page: number, status: string | undefined, month: string | undefined, search: string | undefined) =>
  read<EarningList | null>("/api/referrals/earnings", null, { page, limit: EARNINGS_PAGE_SIZE, status, month, search: search || undefined }),
);

// Every line ready to withdraw, oldest first.
export const getAvailableEarnings = cache(async (): Promise<Earning[] | null> => (await read<{ data: Earning[] } | null>("/api/referrals/earnings/available", null))?.data ?? null);

export const getReferralLinks = cache(() => read<ReferralLink[] | null>("/api/referrals/links", null));

export const getReferralProfile = cache(() => read<ReferralProfile | null>("/api/referrals/profile", null));

// The sign-up page waits on this one, so a slow API gets this long.
const INVITE_READ_TIMEOUT_MS = 3000;

// Who invited the visitor to sign up (a ?ref= link), or null when the API
// can't say. No sign-in; the visitor's address goes along, since the API
// counts these per visitor.
export const getReferralInvite = cache(async (code: string): Promise<ReferralInvite | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/referrals/invite/${encodeURIComponent(code)}`, {
      cache: "no-store",
      headers: await getClientHeaders(),
      signal: AbortSignal.timeout(INVITE_READ_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as ReferralInvite;
  } catch {
    return null;
  }
});

// The person's referral code for Settings › Profile's side card, and what
// it gives; null when the program can't be read.
export async function getProfileReferral(): Promise<ProfileReferral | null> {
  const info = await getReferralInfo().catch(() => null);
  return info?.referralCode ? { code: info.referralCode, friendDiscountPct: info.program.friendDiscountPct, commissionPct: info.program.commissionPct } : null;
}
