// Server-only helpers for Habit Tracker -> Book. User-scoped like lib/habits.ts.
import { cache } from "react";
import { API_BASE_URL, type BooksOverview } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import { emptyUnlessOutage } from "./readFallback";
import { customerApi } from "./apiClient";

// null (not an empty library) when the backend answers that there is
// nothing here; an outage throws to the error screen (readFallback.ts), so a
// hiccup never looks like "all your books are gone".
export const getBooksOverview = cache(async (): Promise<BooksOverview | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  try {
    const res = await customerApi.get<BooksOverview>(`${API_BASE_URL}/api/books`, { headers: { Authorization: `Bearer ${accessToken}` } });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});
