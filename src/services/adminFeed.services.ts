"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IAdminFeed, IAdminSearchResult } from "@/types/adminFeed.types";

// The admin top bar: the bell's feed and the Ctrl K search.
export const getAdminFeed = async () => httpClient.get<IAdminFeed>("/admin/feed");

export const markAdminFeedSeen = async () => httpClient.post<{ seenAt: string }>("/admin/feed/seen");

export const searchAdmin = async (q: string) => httpClient.get<IAdminSearchResult>(`/admin/search?q=${encodeURIComponent(q)}`);
