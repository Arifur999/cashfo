"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { OWNER_TABS, ownerTabOf, type OwnerTab } from "./peopleDisplay";

const LABEL: Record<OwnerTab, string> = { overview: "Overview", billing: "Billing", activity: "Activity", support: "Support", notes: "Notes" };

// The person page's sections (AdminUserDetail): Overview, Billing, Activity,
// Support and Notes, with a count beside the ones that have rows. Each tab
// keeps the page's other params (?from=, ?back=), so the way back still
// leads to the list it was opened from.
export function OwnerTabs({ counts }: { counts?: { billing: number; support: number; notes: number } }) {
  const { translate, locale } = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const open = ownerTabOf(searchParams.get("tab") ?? undefined);

  const hrefFor = (tab: OwnerTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <nav aria-label={translate("User sections")} className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line scrollbar-none [&::-webkit-scrollbar]:hidden">
      {OWNER_TABS.map((tab) => {
        const on = tab === open;
        const count = tab === "billing" || tab === "support" || tab === "notes" ? counts?.[tab] : undefined;
        return (
          <Link
            key={tab}
            href={hrefFor(tab)}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={cn(
              "relative flex h-10 shrink-0 items-center gap-1.5 px-3 text-body transition-colors focus-visible:-outline-offset-2",
              on ? "font-semibold text-ink after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-emerald" : "font-medium text-ink-muted hover:text-ink",
            )}
          >
            {translate(LABEL[tab])}
            {count !== undefined && count > 0 && <span className="rounded-full bg-surface-sunken px-1.5 text-[11.5px] font-semibold text-ink-2 tabular-nums">{formatCount(count, locale)}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
