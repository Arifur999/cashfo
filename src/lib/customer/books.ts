// Server-only helpers for Habit Tracker -> Book. User-scoped like lib/habits.ts.
import { cache } from "react";
import { API_BASE_URL, type BookDetail, type BookPages, type BookYear, type BooksOverview } from "./api";
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

// Library › Dashboard's year; null when there is nothing to read.
export const getBookYear = cache(async (year: number): Promise<BookYear | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  try {
    const res = await customerApi.get<BookYear>(`${API_BASE_URL}/api/books/year`, { headers: { Authorization: `Bearer ${accessToken}` }, params: { year } });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});

// The book page: the book, every note and the shelves; null when there is
// no such book of the reader's.
export const getBookDetail = cache(async (id: string): Promise<BookDetail | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  try {
    const res = await customerApi.get<BookDetail>(`${API_BASE_URL}/api/books/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});

// Library › Dashboard: the pages read from one day to another (both in).
export const getBookPages = cache(async (from: string, to: string): Promise<BookPages | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  try {
    const res = await customerApi.get<BookPages>(`${API_BASE_URL}/api/books/pages`, { headers: { Authorization: `Bearer ${accessToken}` }, params: { from, to } });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});
