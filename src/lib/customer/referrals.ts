// Server-only readers for the Referral Program pages; an outage reaches the
// error screen (see readFallback.ts). Client components use
// referralActions.ts.
import "server-only";
import { cache } from "react";
import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "./api";
import { customerApi } from "./apiClient";
import { emptyUnlessOutage } from "./readFallback";
import type { PayoutMethod, ReferralInvite, ReferralProgramInfo, WithdrawalList } from "./referralTypes";

// How many withdrawals a page of the Withdrawals tab lists.
export const WITHDRAWALS_PAGE_SIZE = 10;

export const getReferralInfo = cache(async (): Promise<ReferralProgramInfo | null> => {
  try {
    const response = await customerApi.get<ReferralProgramInfo>("/api/referrals");
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});

// Where the member's money can be sent. An older backend without the
// route answers 404, which reads as none saved.
export const getPayoutMethods = cache(async (): Promise<PayoutMethod[]> => {
  try {
    const response = await customerApi.get<PayoutMethod[]>("/api/referrals/payout-methods");
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

export const getWithdrawals = cache(async (page: number = 1): Promise<WithdrawalList | null> => {
  try {
    const response = await customerApi.get<WithdrawalList>("/api/referrals/withdrawals", { params: { page, limit: WITHDRAWALS_PAGE_SIZE } });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});

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
