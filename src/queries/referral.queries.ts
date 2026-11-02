import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getCommissions, getPayoutById, getPayouts, getReferralSettings } from "@/services/referral.services";

// The four figures over the desk read the menu count's query
// (navBadge.queries.ts payoutStatsQuery), so the two never disagree.

export const payoutsListQuery = (queryString: string) =>
  queryOptions({
    queryKey: queryKeys.referralPayouts.list(queryString),
    queryFn: () => getPayouts(queryString),
  });

export const payoutDetailQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.referralPayouts.detail(id),
    queryFn: () => getPayoutById(id),
  });

export const referralsListQuery = (queryString: string) =>
  queryOptions({
    queryKey: queryKeys.referrals.list(queryString),
    queryFn: () => getCommissions(queryString),
  });

export const referralSettingsQuery = () =>
  queryOptions({
    queryKey: queryKeys.referralSettings,
    queryFn: () => getReferralSettings(),
  });
