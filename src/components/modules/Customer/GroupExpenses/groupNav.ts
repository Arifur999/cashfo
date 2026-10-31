"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { GROUP_TAB_LABELS, GROUP_TABS, groupTabFrom, groupTabHref, type GroupTab } from "@/lib/customer/groupDisplay";

// Inside a group the sidebar's Group Expense shows the group's pages (the
// AppSidebar board's subs). The address names the group; whether it counts
// meals only its page knows, so the page tells the menu here.

interface GroupNavInfo {
  businessId: string;
  meals: boolean;
}

let info: GroupNavInfo | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const read = () => info;
const nothing = () => null;

// Called by the group page while it is on screen.
export function useTellGroupNav(businessId: string, meals: boolean) {
  useEffect(() => {
    info = { businessId, meals };
    for (const listener of listeners) listener();
    return () => {
      info = null;
      for (const listener of listeners) listener();
    };
  }, [businessId, meals]);
}

export interface GroupPageLink {
  label: string;
  href: string;
  tab: GroupTab | null;
}

// The group's pages for the menu, with the one on screen; null outside a group.
export function useGroupPages(): { links: GroupPageLink[]; current: GroupTab } | null {
  const pathname = usePathname();
  const tab = useSearchParams().get("tab");
  const told = useSyncExternalStore(subscribe, read, nothing);
  const businessId = /^\/group-expenses\/([^/?#]+)/.exec(pathname)?.[1] ?? null;
  if (!businessId) return null;
  const meals = told?.businessId === businessId && told.meals;
  const tabs = GROUP_TABS.filter((value) => value !== "meals" || meals);
  return {
    links: [{ label: "All groups", href: "/group-expenses", tab: null }, ...tabs.map((value) => ({ label: GROUP_TAB_LABELS[value], href: groupTabHref(businessId, value), tab: value }))],
    current: groupTabFrom(tab),
  };
}

// The sidebar item the pages hang under.
export const GROUP_NAV_HREF = "/group-expenses";
