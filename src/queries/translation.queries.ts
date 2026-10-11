import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getTranslations } from "@/services/translation.services";

export const translationsQuery = () =>
  queryOptions({
    queryKey: queryKeys.translations.list(),
    queryFn: () => getTranslations(),
  });
