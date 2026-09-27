// Server-only helpers for Habit Tracker -> Book. User-scoped like lib/habits.ts.
import axios from "axios";
import { cache } from "react";
import { API_BASE_URL, type BooksOverview } from "./api";
import { getAccessToken } from "./tokenCookies";

// null (not an empty library) when the request fails, so a hiccup never looks
// like "all your books are gone".
export const getBooksOverview = cache(async (): Promise<BooksOverview | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  try {
    const res = await axios.get<BooksOverview>(`${API_BASE_URL}/api/books`, { headers: { Authorization: `Bearer ${accessToken}` } });
    return res.data;
  } catch {
    return null;
  }
});

// Whole days since 1970-01-01 on the Asia/Dhaka calendar (fixed UTC+6). One
// number that flips at Dhaka midnight, from which the page picks today's
// quote -- computed on the server so the server and client render the same one.
export function dhakaDayNumber(): number {
  return Math.floor((Date.now() + 6 * 60 * 60 * 1000) / 86_400_000);
}
