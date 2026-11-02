import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getZakatPrices } from "@/services/zakat.services";

// Admin > Settings > Zakat prices.
export const zakatPricesQuery = () =>
  queryOptions({
    queryKey: queryKeys.zakatPrices.all,
    queryFn: () => getZakatPrices(),
  });
