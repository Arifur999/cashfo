"use server";

import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "./api";
import { customerApi } from "./apiClient";
import { callCodeApi, type CodeResult } from "./codeCall";
import type {
  EarningList,
  FriendDetail,
  PayoutMethod,
  PayoutMethodInput,
  PayoutRequest,
  ReferralLink,
  ReferralProfile,
  ReferralProgramInfo,
  StartWithdrawalInput,
  WithdrawalChallenge,
  WithdrawalList,
} from "./referralTypes";

// A referral call's result: see CodeResult.
export type ReferralResult<T = void> = CodeResult<T>;

const callApi = callCodeApi;
const enc = encodeURIComponent;

// What is ready to withdraw, for the account menu.
export async function getReferralInfoAction(): Promise<ReferralResult<ReferralProgramInfo>> {
  return callApi(async () => (await customerApi.get<ReferralProgramInfo>("/api/referrals")).data, "Failed to load referral info");
}

// --- Referred users ---

export async function getFriendDetailAction(id: string): Promise<ReferralResult<FriendDetail>> {
  return callApi(async () => (await customerApi.get<FriendDetail>(`/api/referrals/friends/${enc(id)}`)).data, "Couldn't load this friend.");
}

// "Send a reminder" to friends who joined but haven't bought: a note in
// their bell, once a week at most.
export async function remindFriendsAction(referralIds: string[]): Promise<ReferralResult<{ sent: number; skipped: number }>> {
  return callApi(async () => (await customerApi.post<{ sent: number; skipped: number }>("/api/referrals/remind", { referralIds })).data, "Couldn't send the reminder.");
}

// --- Earnings ---

export async function listEarningsAction(query: { page: number; limit: number; status?: string; dateFrom?: string; dateTo?: string; search?: string }): Promise<ReferralResult<EarningList>> {
  return callApi(async () => (await customerApi.get<EarningList>("/api/referrals/earnings", { params: query })).data, "Couldn't load your earnings.");
}

// --- Invite links ---

export async function createReferralLinkAction(label: string, tag: string): Promise<ReferralResult<ReferralLink[]>> {
  return callApi(async () => (await customerApi.post<ReferralLink[]>("/api/referrals/links", { label, tag })).data, "Couldn't make the link.");
}

export async function renameReferralLinkAction(id: string, label: string): Promise<ReferralResult<ReferralLink[]>> {
  return callApi(async () => (await customerApi.patch<ReferralLink[]>(`/api/referrals/links/${enc(id)}`, { label })).data, "Couldn't rename the link.");
}

export async function deleteReferralLinkAction(id: string): Promise<ReferralResult<ReferralLink[]>> {
  return callApi(async () => (await customerApi.delete<ReferralLink[]>(`/api/referrals/links/${enc(id)}`)).data, "Couldn't delete the link.");
}

// An open of someone's invite link, from the sign-up page (no sign-in).
// Best-effort: a count that fails never troubles the visitor.
export async function countInviteClickAction(code: string, src: string | null): Promise<void> {
  if (!/^[A-Za-z0-9]{4,16}$/.test(code) || (src !== null && !/^[a-z0-9]{2,20}$/.test(src))) return;
  try {
    await fetch(`${API_BASE_URL}/api/referrals/invite/${enc(code)}/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await getClientHeaders()) },
      body: JSON.stringify(src ? { src } : {}),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Only a statistic.
  }
}

// --- Profile & payouts ---

export async function updateReferralProfileAction(input: { referralName?: string | null; emailEarned?: boolean; emailPayouts?: boolean }): Promise<ReferralResult<ReferralProfile>> {
  return callApi(async () => (await customerApi.patch<ReferralProfile>("/api/referrals/profile", input)).data, "Couldn't save your profile.");
}

export async function listPayoutMethodsAction(): Promise<ReferralResult<PayoutMethod[]>> {
  return callApi(async () => (await customerApi.get<PayoutMethod[]>("/api/referrals/payout-methods")).data, "Couldn't load your payout methods.");
}

export async function createPayoutMethodAction(input: PayoutMethodInput): Promise<ReferralResult<PayoutMethod>> {
  return callApi(async () => (await customerApi.post<PayoutMethod>("/api/referrals/payout-methods", input)).data, "Couldn't save the account.");
}

export async function updatePayoutMethodAction(id: string, input: Partial<PayoutMethodInput>): Promise<ReferralResult<PayoutMethod>> {
  return callApi(async () => (await customerApi.patch<PayoutMethod>(`/api/referrals/payout-methods/${enc(id)}`, input)).data, "Couldn't save the account.");
}

export async function makeDefaultPayoutMethodAction(id: string): Promise<ReferralResult<PayoutMethod>> {
  return callApi(async () => (await customerApi.post<PayoutMethod>(`/api/referrals/payout-methods/${enc(id)}/default`)).data, "Couldn't save the account.");
}

export async function deletePayoutMethodAction(id: string): Promise<ReferralResult<{ success: boolean }>> {
  return callApi(async () => (await customerApi.delete<{ success: boolean }>(`/api/referrals/payout-methods/${enc(id)}`)).data, "Couldn't remove the account.");
}

// --- Withdrawals: start (a code is sent), confirm with the code ---

export async function startWithdrawalAction(input: StartWithdrawalInput): Promise<ReferralResult<WithdrawalChallenge>> {
  return callApi(async () => (await customerApi.post<WithdrawalChallenge>("/api/referrals/withdrawals/start", input)).data, "We couldn't start the withdrawal. Please try again.");
}

export async function resendWithdrawalCodeAction(challengeId: string): Promise<ReferralResult<WithdrawalChallenge>> {
  return callApi(
    async () => (await customerApi.post<WithdrawalChallenge>(`/api/referrals/withdrawals/start/${enc(challengeId)}/resend`)).data,
    "We couldn't send the code. Please try again in a minute.",
  );
}

export async function confirmWithdrawalAction(challengeId: string, code: string): Promise<ReferralResult<PayoutRequest>> {
  return callApi(async () => (await customerApi.post<PayoutRequest>("/api/referrals/withdrawals", { challengeId, code })).data, "We couldn't confirm the withdrawal. Please try again.");
}

export async function listWithdrawalsAction(page: number, limit: number): Promise<ReferralResult<WithdrawalList>> {
  return callApi(async () => (await customerApi.get<WithdrawalList>("/api/referrals/withdrawals", { params: { page, limit } })).data, "Couldn't load your withdrawals.");
}

export async function cancelWithdrawalAction(id: string): Promise<ReferralResult<PayoutRequest>> {
  return callApi(async () => (await customerApi.post<PayoutRequest>(`/api/referrals/withdrawals/${enc(id)}/cancel`)).data, "Couldn't cancel the request.");
}
