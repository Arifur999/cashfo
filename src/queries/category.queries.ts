import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getCategories } from "@/services/category.services";

export const categoriesQuery = () =>
  queryOptions({
    queryKey: queryKeys.categories.list(),
    queryFn: () => getCategories(),
  });
