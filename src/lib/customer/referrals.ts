// Server-only reader for the Referrals page; an outage reaches the error
// screen (see readFallback.ts). Client components use referralActions.ts.
import { cache } from "react";
import type { ReferralInfo } from "./api";
import { customerApi } from "./apiClient";
import { emptyUnlessOutage } from "./readFallback";

export const getReferralInfo = cache(async (): Promise<ReferralInfo | null> => {
  try {
    const response = await customerApi.get<ReferralInfo>("/api/referrals");
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});
