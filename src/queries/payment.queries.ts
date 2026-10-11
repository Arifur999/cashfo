import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getPayments } from "@/services/payment.services";

export type PaymentsView = "all" | "failed";

// `view` picks the endpoint, so it's part of the key alongside the query.
export const paymentsListQuery = (queryString: string, view: PaymentsView) =>
  queryOptions({
    queryKey: [...queryKeys.payments.list(queryString), view] as const,
    queryFn: () => getPayments(queryString, view),
  });
