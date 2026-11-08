// Server-only reader for AI Insights; an outage reaches the error screen
// (see readFallback.ts). Client components use aiInsightsActions.ts.
import "server-only";
import { cache } from "react";
import type { AiInsightsPage } from "./aiInsightsTypes";
import { customerApi } from "./apiClient";
import { emptyUnlessOutage } from "./readFallback";

// The person's AI settings and, while it is on, the workspace's report;
// null when it can't be read (a member without access, an older backend).
export const getAiInsights = cache(async (businessId: string): Promise<AiInsightsPage | null> => {
  try {
    const response = await customerApi.get<AiInsightsPage>(`/api/businesses/${encodeURIComponent(businessId)}/insights`);
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});
