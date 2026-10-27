"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { ApiResponse, PaginationMeta } from "@/types/api.types";
import type {
  IAdminReferralRow,
  IMarkPayoutPaidPayload,
  IPayoutDetail,
  IPayoutRow,
  IReferralSettings,
  IReferralSettingsPayload,
  PayoutStatusCounts,
  ReferralStatusCounts,
} from "@/types/referral.types";

// The lists bring their tabs' counts beside meta; they ride on meta here,
// as the payments list's do, so a table reads them where it reads the pager.
interface CountedBody<TRow, TCounts> {
  data: TRow[];
  meta: PaginationMeta;
  statusCounts: TCounts;
}

const counted = async <TRow, TCounts>(endpoint: string): Promise<ApiResponse<TRow[]>> => {
  const { data: body } = await httpClient.get<CountedBody<TRow, TCounts>>(endpoint);
  return { success: true, message: "", data: body.data, meta: { ...body.meta, statusCounts: body.statusCounts } as PaginationMeta };
};

// --- The payout desk ---

export const getPayouts = async (queryString: string) => counted<IPayoutRow, PayoutStatusCounts>(`/admin/referrals/payouts?${queryString}`);

export const getPayoutById = async (id: string) => httpClient.get<IPayoutDetail>(`/admin/referrals/payouts/${id}`);

export const approvePayout = async (id: string) => httpClient.post<IPayoutDetail>(`/admin/referrals/payouts/${id}/approve`);

export const rejectPayout = async (id: string, reason: string) => httpClient.post<IPayoutDetail>(`/admin/referrals/payouts/${id}/reject`, { reason });

export const markPayoutPaid = async (id: string, payload: IMarkPayoutPaidPayload) => httpClient.post<IPayoutDetail>(`/admin/referrals/payouts/${id}/mark-paid`, payload);

// --- Every referral ---

export const getReferrals = async (queryString: string) => counted<IAdminReferralRow, ReferralStatusCounts>(`/admin/referrals?${queryString}`);

export const cancelReferral = async (id: string, reason: string) => httpClient.post<{ success: boolean }>(`/admin/referrals/${id}/cancel`, { reason });

// --- Settings ---

export const getReferralSettings = async () => httpClient.get<IReferralSettings>("/admin/referrals/settings");

export const updateReferralSettings = async (payload: IReferralSettingsPayload) => httpClient.patch<IReferralSettings>("/admin/referrals/settings", payload);
