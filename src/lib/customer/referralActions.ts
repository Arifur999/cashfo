"use server";

import { getAccessToken } from "@/lib/tokenUtils";
import { API_BASE_URL, type ReferralInfo } from "./api";
import type { ActionResult } from "./authActions";
import { customerApi } from "./apiClient";
import { callCodeApi, type CodeResult } from "./codeCall";
import type { PayoutMethod, PayoutMethodInput, PayoutRequest, StartWithdrawalInput, WithdrawalChallenge, WithdrawalList } from "./referralTypes";

async function authHeaders() {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${accessToken}` };
}

// A referral call's result: see CodeResult.
export type ReferralResult<T = void> = CodeResult<T>;

const callApi = callCodeApi;

export async function getReferralInfoAction(): Promise<ActionResult<ReferralInfo>> {
  return callApi(async () => {
    const res = await customerApi.get<ReferralInfo>(`${API_BASE_URL}/api/referrals`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to load referral info");
}

// The old instant withdrawal: old sign-up bonuses booked as Referral income
// into one of this workspace's wallets.
export async function withdrawReferralEarningsAction(businessId: string, accountId: string): Promise<ActionResult<{ withdrawnAmount: string }>> {
  return callApi(async () => {
    const res = await customerApi.post<{ withdrawnAmount: string }>(
      `${API_BASE_URL}/api/businesses/${businessId}/referrals/withdraw`,
      { accountId },
      { headers: await authHeaders() },
    );
    return res.data;
  }, "Failed to withdraw earnings");
}

// --- Where the money goes ---

export async function listPayoutMethodsAction(): Promise<ReferralResult<PayoutMethod[]>> {
  return callApi(async () => (await customerApi.get<PayoutMethod[]>("/api/referrals/payout-methods")).data, "Couldn't load your payout methods.");
}

export async function createPayoutMethodAction(input: PayoutMethodInput): Promise<ReferralResult<PayoutMethod>> {
  return callApi(async () => (await customerApi.post<PayoutMethod>("/api/referrals/payout-methods", input)).data, "Couldn't save the account.");
}

export async function updatePayoutMethodAction(id: string, input: Partial<PayoutMethodInput>): Promise<ReferralResult<PayoutMethod>> {
  return callApi(async () => (await customerApi.patch<PayoutMethod>(`/api/referrals/payout-methods/${encodeURIComponent(id)}`, input)).data, "Couldn't save the account.");
}

export async function makeDefaultPayoutMethodAction(id: string): Promise<ReferralResult<PayoutMethod>> {
  return callApi(async () => (await customerApi.post<PayoutMethod>(`/api/referrals/payout-methods/${encodeURIComponent(id)}/default`)).data, "Couldn't save the account.");
}

export async function deletePayoutMethodAction(id: string): Promise<ReferralResult<{ success: boolean }>> {
  return callApi(async () => (await customerApi.delete<{ success: boolean }>(`/api/referrals/payout-methods/${encodeURIComponent(id)}`)).data, "Couldn't remove the account.");
}

// --- Withdrawals: start (a code is emailed), confirm with the code ---

export async function startWithdrawalAction(input: StartWithdrawalInput): Promise<ReferralResult<WithdrawalChallenge>> {
  return callApi(async () => (await customerApi.post<WithdrawalChallenge>("/api/referrals/withdrawals/start", input)).data, "We couldn't start the withdrawal. Please try again.");
}

export async function resendWithdrawalCodeAction(challengeId: string): Promise<ReferralResult<WithdrawalChallenge>> {
  return callApi(
    async () => (await customerApi.post<WithdrawalChallenge>(`/api/referrals/withdrawals/start/${encodeURIComponent(challengeId)}/resend`)).data,
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
  return callApi(async () => (await customerApi.post<PayoutRequest>(`/api/referrals/withdrawals/${encodeURIComponent(id)}/cancel`)).data, "Couldn't cancel the request.");
}

// "Send a reminder" to friends who joined but haven't bought.
export async function remindFriendsAction(referralIds: string[]): Promise<ReferralResult<{ sent: number; skipped: number }>> {
  return callApi(async () => (await customerApi.post<{ sent: number; skipped: number }>("/api/referrals/remind", { referralIds })).data, "Couldn't send the reminder.");
}
