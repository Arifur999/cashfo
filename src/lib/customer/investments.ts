// Server-only reader for the Investments pages, same shape as assets.ts: an
// outage reaches the error screen instead of reading as "no investments
// yet" (see readFallback.ts). Client components use investmentActions.ts.
import { cache } from "react";
import { customerApi } from "./apiClient";
import type { Investment } from "./investmentTypes";
import { emptyUnlessOutage } from "./readFallback";

export const getInvestments = cache(async (businessId: string): Promise<Investment[]> => {
  try {
    const response = await customerApi.get<Investment[]>(`/api/businesses/${businessId}/investments`);
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});
