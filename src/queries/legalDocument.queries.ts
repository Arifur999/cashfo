import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getLegalDocuments, getLegalVersions } from "@/services/legalDocument.services";
import type { LegalDocType } from "@/types/legalDocument.types";

export const legalDocumentsQuery = () =>
  queryOptions({
    queryKey: queryKeys.legalDocuments.list(),
    queryFn: () => getLegalDocuments(),
  });

// One page's versions (its open draft's text among them), under the same
// domain, so saving or publishing refreshes both.
export const legalVersionsQuery = (type: LegalDocType) =>
  queryOptions({
    queryKey: queryKeys.legalDocuments.detail(type),
    queryFn: () => getLegalVersions(type),
  });
