"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { userRecordHref, type UserOrigin } from "@/lib/navItem";
import { withListState } from "./peopleDisplay";

// A person's page as a list opens it: marked with the list it came from
// (Owners, Workspaces), and carrying the list's filters and page, so the
// page's way back returns to the same rows rather than page 1 unfiltered.
export function usePersonHref(from?: UserOrigin) {
  const listQuery = useSearchParams().toString();
  return useCallback((userId: string) => withListState(userRecordHref(userId, from), listQuery), [from, listQuery]);
}
