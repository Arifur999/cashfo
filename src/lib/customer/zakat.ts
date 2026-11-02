// Server-only reader for the Zakat page; an outage reaches the error screen
// (see readFallback.ts). Client components use zakatActions.ts.
import "server-only";
import { cache } from "react";
import { customerApi } from "./apiClient";
import { emptyUnlessOutage } from "./readFallback";
import type { ZakatSummary } from "./zakatTypes";

// The year's zakat worked out from the workspace's records; null when it
// can't be read (a member without access, an older backend).
export const getZakatSummary = cache(async (businessId: string): Promise<ZakatSummary | null> => {
  try {
    const response = await customerApi.get<ZakatSummary>(`/api/businesses/${encodeURIComponent(businessId)}/zakat`);
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});
