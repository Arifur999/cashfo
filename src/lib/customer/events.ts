// Server-only reader for Calendar & Events; an outage reaches the error
// screen (see readFallback.ts). Client components use eventActions.ts.
import "server-only";
import { cache } from "react";
import { customerApi } from "./apiClient";
import type { EventsOverview } from "./eventsTypes";
import { emptyUnlessOutage } from "./readFallback";

// The workspace's people and every event with its gifts; null when it
// can't be read (a member without access, an older backend).
export const getEventsOverview = cache(async (businessId: string): Promise<EventsOverview | null> => {
  try {
    const response = await customerApi.get<EventsOverview>(`/api/businesses/${encodeURIComponent(businessId)}/events`);
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});
