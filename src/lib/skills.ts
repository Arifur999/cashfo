// Server-only helpers for Habit Tracker -> Skills. User-scoped like lib/books.ts.
import axios from "axios";
import { cache } from "react";
import { API_BASE_URL, type SkillsOverview } from "./api";
import { getAccessToken } from "./tokenCookies";

// null (not an empty list) when the request fails, so a hiccup never looks
// like "all your skills are gone".
export const getSkillsOverview = cache(async (): Promise<SkillsOverview | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  try {
    const res = await axios.get<SkillsOverview>(`${API_BASE_URL}/api/skills`, { headers: { Authorization: `Bearer ${accessToken}` } });
    return res.data;
  } catch {
    return null;
  }
});
