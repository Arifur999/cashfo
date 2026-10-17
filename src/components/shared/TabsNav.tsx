"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { formatNumber } from "@/lib/number";
import { cn } from "@/lib/utils";

export interface TabDef {
  label: string;
  href: string;
  // A count in a small pill after the label ("Tickets 18"); "danger" draws
  // it red, for things waiting on someone ("Suspicious activity 3"), and
  // "warning" amber ("Errors 12").
  count?: number;
  countTone?: "neutral" | "warning" | "danger";
  // Exact-match against pathname+query instead of a prefix match -- needed
  // when two tabs share the same path and differ only by query string (e.g.
  // Payments vs Failed Payments both live at /admin/payments).
  exact?: boolean;
}

const parseHref = (href: string) => {
  const [path, query = ""] = href.split("?");
  return { path, params: [...new URLSearchParams(query)] };
};

const hasParams = (params: [string, string][], current: URLSearchParams) =>
  params.every(([key, value]) => current.get(key) === value);

// Exact tabs ignore unrelated params (?page=2 keeps "All Payments" active):
// a tab with its own query (?view=failed) is active when the URL carries
// it; the query-less tab on the same path is active when no sibling's is.
const isTabActive = (tab: TabDef, tabs: TabDef[], pathname: string, current: URLSearchParams) => {
  if (!tab.exact) {
    return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
  }
  const { path, params } = parseHref(tab.href);
  if (pathname !== path) {
    return false;
  }
  if (params.length > 0) {
    return hasParams(params, current);
  }
  return !tabs.some((other) => {
    if (other === tab || !other.exact) return false;
    const sibling = parseHref(other.href);
    return sibling.path === path && sibling.params.length > 0 && hasParams(sibling.params, current);
  });
};

// Route-level tabs: each tab is a link to its own page. Drawn as the
// design's section tabs: 40px tall on a line, the open one in bold with a
// short emerald underline.
const TabsNav = ({ tabs, label = "Section" }: { tabs: TabDef[]; label?: string }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = new URLSearchParams(searchParams.toString());

  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => {
        const isActive = isTabActive(tab, tabs, pathname, current);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex h-10 shrink-0 items-center gap-2 px-3 text-body transition-colors",
              isActive
                ? "font-semibold text-ink after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-emerald"
                : "font-medium text-ink-muted hover:text-ink",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 text-caption tabular-nums",
                  tab.countTone === "danger" && "bg-expense-soft font-bold text-expense",
                  tab.countTone === "warning" && "bg-warning-soft font-bold text-warning",
                  (!tab.countTone || tab.countTone === "neutral") && "bg-surface-sunken font-semibold text-ink-2",
                )}
              >
                {formatNumber(tab.count)}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export default TabsNav;
