// Server-only helpers for Habit Tracker -> Skills. User-scoped like lib/books.ts.
import { cache } from "react";
import { API_BASE_URL, type SkillDetail, type SkillLogRow, type SkillsOverview } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import { emptyUnlessOutage } from "./readFallback";
import { customerApi } from "./apiClient";

// null (not an empty list) when the backend answers that there is nothing
// here; an outage throws to the error screen (readFallback.ts), so a hiccup
// never looks like "all your skills are gone".
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

// The skill page; null when there is no such skill of the reader's.
export const getSkillDetail = cache(async (id: string): Promise<SkillDetail | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  try {
    const res = await customerApi.get<SkillDetail>(`${API_BASE_URL}/api/skills/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});

// Skills › Dashboard: every day of practice from one day to another.
export const getSkillPractice = cache(async (from: string, to: string): Promise<SkillLogRow[] | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  try {
    const res = await customerApi.get<{ logs: SkillLogRow[] }>(`${API_BASE_URL}/api/skills/practice`, { headers: { Authorization: `Bearer ${accessToken}` }, params: { from, to } });
    return res.data.logs;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});
