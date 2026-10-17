import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getPayments, getPaymentStats } from "@/services/payment.services";

export const paymentsListQuery = (queryString: string) =>
  queryOptions({
    queryKey: queryKeys.payments.list(queryString),
    queryFn: () => getPayments(queryString),
  });

// Under payments.all, so a refund or retry refreshes the figures too.
export const paymentStatsQuery = () =>
  queryOptions({
    queryKey: [...queryKeys.payments.all, "stats"] as const,
    queryFn: () => getPaymentStats(),
  });
