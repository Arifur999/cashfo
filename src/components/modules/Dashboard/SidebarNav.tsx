"use client";

import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createElement, useEffect, useId, useRef, useSyncExternalStore } from "react";
import { getIconComponent } from "@/lib/iconMapper";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { findAdminNavLocation, isNavItemViewOnly, menuPathFor, navItemHref, type NavItem, type NavSection } from "@/lib/navItem";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/types/auth.types";
import NavBadge from "./NavBadge";

interface SidebarNavProps {
  sections: NavSection[];
  role: AdminRole;
  // Lets the mobile drawer close itself after a link is followed.
  onNavigate?: () => void;
  className?: string;
}

// The one group the admin opened or closed, kept in this browser across
// pages: "" leaves the open page's group open, "-" closes them all, an href
// opens that group alone. One store for the sidebar and the phone drawer.
const OPEN_GROUP_KEY = "smartly.admin.sidebar.group";
const listeners = new Set<() => void>();
let inMemory = "";

function readOpenGroup(): string {
  try {
    return window.localStorage.getItem(OPEN_GROUP_KEY) ?? inMemory;
  } catch {
    return inMemory;
  }
}

function writeOpenGroup(value: string) {
  inMemory = value;
  try {
    window.localStorage.setItem(OPEN_GROUP_KEY, value);
  } catch {
    // Storage refused (a private window): the choice lasts until the tab closes.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The server can't see this browser's choice: it opens the page's group.
const nothingChosen = () => "";

// A group shows its pages (the tabs under its header) one at a time: the
// open page's group until the admin opens another or closes it. Moving to a
// page of another group starts from that group again.
function useOpenGroup(current: string | null) {
  const chosen = useSyncExternalStore(subscribe, readOpenGroup, nothingChosen);
  const shownFor = useRef(current);
  useEffect(() => {
    if (shownFor.current === current) return;
    shownFor.current = current;
    if (readOpenGroup() !== "") writeOpenGroup("");
  }, [current]);
  const isOpen = (item: NavItem) => (chosen === "" ? current === item.href : chosen === item.href);
  const toggle = (item: NavItem) => writeOpenGroup(isOpen(item) ? "-" : item.href);
  return { isOpen, toggle };
}

// The admin menu on the deep-teal panel: 38px rows in groups 14px apart
// (no group names, as the customer menu), the open page on mint with forest
// text, a lock on pages this role can only read and a count where work is
// waiting. A page with several tabs (Subscriptions: Plans, Coupons) lists
// them under it; its name or chevron opens and folds them, one group at a
// time. A user's page opened from Owners or Workspaces keeps that item lit
// (its ?from=).
const SidebarNav = ({ sections, role, onNavigate, className }: SidebarNavProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { translate } = useLocale();
  const baseId = useId();
  const menuPath = menuPathFor(pathname, searchParams.get("from"));
  const location = findAdminNavLocation(menuPath, sections);
  const { isOpen, toggle } = useOpenGroup(location?.item.tabs && location.item.tabs.length > 1 ? location.item.href : null);

  return (
    <nav aria-label={translate("Admin")} className={cn("flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden", className)}>
      {sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-px">
          {/* The space between says where a group starts; a screen reader hears its name. */}
          <span className="sr-only">{translate(section.title)}</span>
          {section.items.map((item) => {
            const lit = location?.item === item;
            const viewOnly = isNavItemViewOnly(item, role);
            const tabs = item.tabs && item.tabs.length > 1 ? item.tabs : null;
            const open = !!tabs && isOpen(item);
            // A group's own row is the page only when it has no pages listed under it.
            const self = lit && (!tabs || !open);
            const pagesId = `${baseId}-pages${item.href.replace(/[^\w-]/g, "-")}`;
            const Chevron = open ? ChevronDown : ChevronRight;
            return (
              <div key={item.href} className="flex flex-col">
                <div className="relative flex">
                  <Link
                    href={navItemHref(item)}
                    onClick={(event) => {
                      if (tabs) {
                        // Open: the name folds its pages away and stays on this page.
                        if (open) event.preventDefault();
                        toggle(item);
                        if (open) return;
                      }
                      onNavigate?.();
                    }}
                    aria-current={self ? "page" : undefined}
                    className={cn(
                      "relative flex h-9.5 min-w-0 flex-1 shrink-0 items-center gap-2.5 rounded-md pl-2.5 text-body whitespace-nowrap transition-colors",
                      tabs ? "pr-9" : "pr-2",
                      self ? "bg-mint-200 font-semibold text-forest" : lit ? "font-semibold text-white hover:bg-white/8" : "font-medium text-white/82 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    {createElement(getIconComponent(item.icon), { className: cn("size-4.25 shrink-0", self ? "text-forest" : lit ? "text-mint-200" : "text-mint-200/75"), strokeWidth: 2, "aria-hidden": true })}
                    <span className="min-w-0 flex-1 truncate">{translate(item.title)}</span>
                    {viewOnly && (
                      <span title={translate("View only for your role")} className={cn("flex", self ? "text-forest/70" : "text-mint-200/75")}>
                        <Lock className="size-3.25" strokeWidth={2.25} aria-hidden="true" />
                        {/* The tooltip only reaches a mouse; this reaches a screen reader. */}
                        <span className="sr-only">{translate("View only for your role")}</span>
                      </span>
                    )}
                    {!viewOnly && item.badge && <NavBadge kind={item.badge} />}
                  </Link>
                  {tabs && (
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={pagesId}
                      aria-label={translate("{group} pages", { group: translate(item.title) })}
                      onClick={() => toggle(item)}
                      className={cn("absolute top-0 right-0 flex h-9.5 w-9 items-center justify-center rounded-md transition-colors", self ? "text-forest/70 hover:text-forest" : "text-mint-200/60 hover:text-white")}
                    >
                      <Chevron className="size-4" strokeWidth={2} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {tabs && (
                  <div id={pagesId} hidden={!open} className="mt-0.5 mb-1 ml-4.75 flex flex-col gap-px border-l border-white/15 pl-2.5">
                    {tabs.map((tab) => {
                      const on = lit && location?.tab === tab;
                      return (
                        <Link
                          key={tab.href}
                          href={tab.href}
                          onClick={onNavigate}
                          aria-current={on ? "page" : undefined}
                          className={cn(
                            "flex h-8 items-center rounded-field px-2.5 text-[13.5px] whitespace-nowrap transition-colors pointer-coarse:h-10",
                            on ? "bg-mint-200 font-semibold text-forest" : "font-medium text-white/72 hover:bg-white/8 hover:text-white",
                          )}
                        >
                          <span className="min-w-0 truncate">{translate(tab.title)}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );
};

export default SidebarNav;
