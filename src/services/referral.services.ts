"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { ApiResponse, PaginationMeta } from "@/types/api.types";
import type {
  CommissionStatusCounts,
  IAdminCommissionRow,
  IMarkPayoutPaidPayload,
  IPayoutDetail,
  IPayoutRow,
  IReferralSettings,
  IReferralSettingsPayload,
  PayoutStatusCounts,
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

// Lines unticked at review are held back for a second look (Under check).
export const approvePayout = async (id: string, excludedIds: string[]) => httpClient.post<IPayoutDetail>(`/admin/referrals/payouts/${id}/approve`, excludedIds.length ? { excludedIds } : {});

export const rejectPayout = async (id: string, reason: string) => httpClient.post<IPayoutDetail>(`/admin/referrals/payouts/${id}/reject`, { reason });

export const markPayoutPaid = async (id: string, payload: IMarkPayoutPaidPayload) => httpClient.post<IPayoutDetail>(`/admin/referrals/payouts/${id}/mark-paid`, payload);

// --- Every commission ---

export const getCommissions = async (queryString: string) => counted<IAdminCommissionRow, CommissionStatusCounts>(`/admin/referrals/commissions?${queryString}`);

export const cancelCommission = async (id: string, reason: string) => httpClient.post<{ success: boolean }>(`/admin/referrals/commissions/${id}/cancel`, { reason });

export const releaseCommission = async (id: string) => httpClient.post<{ success: boolean }>(`/admin/referrals/commissions/${id}/release`);

// --- Settings ---

export const getReferralSettings = async () => httpClient.get<IReferralSettings>("/admin/referrals/settings");

export const updateReferralSettings = async (payload: IReferralSettingsPayload) => httpClient.patch<IReferralSettings>("/admin/referrals/settings", payload);
