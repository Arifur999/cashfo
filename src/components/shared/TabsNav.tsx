"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export interface TabDef {
  label: string;
  href: string;
  // Exact-match against pathname+query instead of a prefix match -- needed
  // when two tabs share the same path and differ only by query string (e.g.
  // Payments vs Failed Payments both live at /admin/payments).
  exact?: boolean;
}

const isTabActive = (tab: TabDef, pathname: string, query: string) => {
  if (tab.exact) {
    const current = query ? `${pathname}?${query}` : pathname;
    return current === tab.href;
  }
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
};

// Route-level tabs: each tab is a link to its own page.
const TabsNav = ({ tabs, label = "Section" }: { tabs: TabDef[]; label?: string }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto border-b">
      {tabs.map((tab) => {
        const isActive = isTabActive(tab, pathname, query);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default TabsNav;
