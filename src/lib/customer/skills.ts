// Server-only helpers for Habit Tracker -> Skills. User-scoped like lib/books.ts.
import { cache } from "react";
import { API_BASE_URL, type SkillsOverview } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import { emptyUnlessOutage } from "./readFallback";
import { customerApi } from "./apiClient";

// null (not an empty list) when the request fails, so a hiccup never looks
// like "all your skills are gone".
export const getSkillsOverview = cache(async (): Promise<SkillsOverview | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  try {
    const res = await customerApi.get<SkillsOverview>(`${API_BASE_URL}/api/skills`, { headers: { Authorization: `Bearer ${accessToken}` } });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});
