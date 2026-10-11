import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getLegalDocuments } from "@/services/legalDocument.services";

export const legalDocumentsQuery = () =>
  queryOptions({
    queryKey: queryKeys.legalDocuments.list(),
    queryFn: () => getLegalDocuments(),
  });
