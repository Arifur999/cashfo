"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IAdminFeed, IAdminSearchResult } from "@/types/adminFeed.types";

// The admin top bar: the bell's feed and the Ctrl K search.
export const getAdminFeed = async () => httpClient.get<IAdminFeed>("/admin/feed");

export const markAdminFeedSeen = async () => httpClient.post<{ seenAt: string }>("/admin/feed/seen");

export const searchAdmin = async (q: string) => httpClient.get<IAdminSearchResult>(`/admin/search?q=${encodeURIComponent(q)}`);

// The menu's count beside Referrals & Payouts: payout requests waiting for
// review (GET /admin/referrals/payouts/stats, any admin may read it).
export interface IPayoutStatsCount {
  count: number;
  amount: string;
}

export interface IPayoutStats {
  waiting: IPayoutStatsCount;
  approved: IPayoutStatsCount;
  paidThisMonth: IPayoutStatsCount & { month: string };
  onHold: IPayoutStatsCount;
}

export const getPayoutStats = async () => httpClient.get<IPayoutStats>("/admin/referrals/payouts/stats");
