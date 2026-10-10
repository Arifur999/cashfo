import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getInvoices } from "@/services/invoice.services";

export const invoicesListQuery = (queryString: string) =>
  queryOptions({
    queryKey: queryKeys.invoices.list(queryString),
    queryFn: () => getInvoices(queryString),
  });
