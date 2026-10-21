"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
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

// How far a faded edge reaches.
const FADE = 32;

// The row scrolls sideways when the tabs don't fit (a phone, five tabs);
// its edges fade while there is more beyond them, in place of a scrollbar.
// The open tab is brought to the middle when it sits past an edge or under
// its fade -- a link straight to the last tab on a phone -- by scrolling the
// row alone, never the page; again when the counts load in, since they widen
// the tabs before it. Re-measured when the tabs change.
function useSideFades<T extends HTMLElement>(openHref: string | undefined, tabCount: number, countsKey: string) {
  const ref = useRef<T>(null);
  const [fades, setFades] = useState({ left: false, right: false });

  useEffect(() => {
    const row = ref.current;
    const tab = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !tab || row.scrollWidth <= row.clientWidth) return;
    const rowBox = row.getBoundingClientRect();
    const tabBox = tab.getBoundingClientRect();
    if (tabBox.left >= rowBox.left + FADE && tabBox.right <= rowBox.right - FADE) return;
    row.scrollLeft += tabBox.left - rowBox.left - (row.clientWidth - tabBox.width) / 2;
  }, [openHref, countsKey]);

  useEffect(() => {
    const row = ref.current;
    if (!row) return;
    const update = () => {
      const left = row.scrollLeft > 4;
      const right = row.scrollWidth - row.scrollLeft - row.clientWidth > 4;
      setFades((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    };
    update();
    row.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(row);
    for (const tab of row.children) observer.observe(tab);
    return () => {
      row.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [tabCount]);

  const left = fades.left ? `transparent 0, #000 ${FADE}px` : "#000 0";
  const right = fades.right ? `#000 calc(100% - ${FADE}px), transparent 100%` : "#000 100%";
  const mask = `linear-gradient(to right, ${left}, ${right})`;
  return { ref, style: { maskImage: mask, WebkitMaskImage: mask } };
}

// Route-level tabs: each tab is a link to its own page. Drawn as the
// design's section tabs: 40px tall on a line, the open one in bold with a
// short emerald underline. Counts are in the reader's digits.
const TabsNav = ({ tabs, label = "Section" }: { tabs: TabDef[]; label?: string }) => {
  const { translate, locale } = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = new URLSearchParams(searchParams.toString());
  const openHref = tabs.find((tab) => isTabActive(tab, tabs, pathname, current))?.href;
  const countsKey = tabs.map((tab) => tab.count ?? "").join(",");
  const { ref, style } = useSideFades<HTMLElement>(openHref, tabs.length, countsKey);

  return (
    // No scrollbar, and no vertical scrolling: the underline reaches 1px past
    // the row, which on Windows used to raise a vertical scrollbar even when
    // every tab fit. scroll-px-8 (the fade's width) stops a tab reached with
    // the Tab key clear of the fades.
    <nav ref={ref} style={style} aria-label={translate(label)} className="flex scroll-px-8 gap-1 overflow-x-auto overflow-y-hidden border-b border-line scrollbar-none [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const isActive = isTabActive(tab, tabs, pathname, current);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              // The ring drawn inside: the scrolling row clips anything outside it.
              "relative flex h-10 shrink-0 items-center gap-2 px-3 text-body transition-colors focus-visible:-outline-offset-2",
              isActive
                ? "font-semibold text-ink after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-emerald"
                : "font-medium text-ink-muted hover:text-ink",
            )}
          >
            {translate(tab.label)}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 text-caption tabular-nums",
                  tab.countTone === "danger" && "bg-expense-soft font-bold text-expense",
                  tab.countTone === "warning" && "bg-warning-soft font-bold text-warning",
                  (!tab.countTone || tab.countTone === "neutral") && "bg-surface-sunken font-semibold text-ink-2",
                )}
              >
                {formatCount(tab.count, locale)}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export default TabsNav;
