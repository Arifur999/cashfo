"use server";

import { runAction } from "@/lib/runAction";
import { getAdminFeed, markAdminFeedSeen, searchAdmin } from "@/services/adminFeed.services";

// Cross-cutting (the top bar on every admin page), so they live here.
export const getAdminFeedAction = async () => runAction("Failed to load notifications", () => getAdminFeed());

export const markAdminFeedSeenAction = async () => runAction("Failed to mark the notifications as read", () => markAdminFeedSeen());

export const adminSearchAction = async (q: string) => runAction("Search failed", () => searchAdmin(q.trim().slice(0, 100)));
