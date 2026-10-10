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

export function TabsNav({ tabs }: { tabs: TabDef[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentFull = `${pathname}?${searchParams.toString()}`;

  return (
    <div className="flex gap-1 border-b border-neutral-200">
      {tabs.map((tab) => {
        const isActive = tab.exact ? currentFull === tab.href || (tab.href === pathname && searchParams.toString() === "") : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              isActive ? "border-brand-primary text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-700",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
