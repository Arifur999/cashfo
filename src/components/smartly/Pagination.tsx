"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/number";
import { pagerModel } from "@/lib/table/pagerModel";
import { cn } from "@/lib/utils";
import NativeSelect from "./form/NativeSelect";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  // A server list: each page is a link (keeping the list's filters).
  hrefFor?: (page: number) => string;
  // A client or admin list: each page is a button.
  onPageChange?: (page: number) => void;
  // "simple" is a time-ordered log's two text buttons (Newer / Older).
  variant?: "numbered" | "simple";
  // Already translated; the simple pager's words.
  labels?: { previous: string; next: string };
  // false hides it; the default is "Showing 1–20 of 54".
  summary?: React.ReactNode | false;
  // Offer a rows-per-page choice (with onPageSizeChange).
  pageSizes?: number[];
  onPageSizeChange?: (size: number) => void;
  // The list to bring back into view and focus after a change, so the next
  // page starts at its top rather than at the footer. A ListCard's id
  // focuses the table inside it.
  focusTargetId?: string;
  className?: string;
}

// 32px rounds (design-v4); 44px under a finger.
const SQUARE = "inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-small font-semibold tabular-nums transition-colors pointer-coarse:h-11 pointer-coarse:min-w-11";
const ARROW = cn(SQUARE, "px-0");
const TEXT = "inline-flex h-8 items-center justify-center rounded-full border px-3 text-small font-semibold transition-colors pointer-coarse:h-11";
const IDLE = "border-line bg-surface text-ink-2 hover:bg-surface-sunken";
// The page on show, in the deep forest (emerald in dark). Pressing it does
// nothing, so no hand cursor.
const CURRENT = "cursor-default border-forest bg-forest text-white dark:border-emerald dark:bg-emerald dark:text-on-action";
// A dead end: faded, as the boards draw it.
const OFF = "cursor-not-allowed border-line bg-surface text-ink-2 opacity-50";

// Inside a focusTargetId, focus goes to the table, which a screen reader
// names ("Transactions, table"), not to the card around it.
const LIST = "table, [role=table]";

const prefersReducedMotion = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The top edge of the box the list scrolls in. The app shells scroll inside
// <main>, below the top bar, so a list can be out of sight while its top is
// still below the window's.
const visibleTop = (node: HTMLElement) => {
  for (let box = node.parentElement; box; box = box.parentElement) {
    const { overflowY } = getComputedStyle(box);
    if ((overflowY === "auto" || overflowY === "scroll") && box.scrollHeight > box.clientHeight) return Math.max(box.getBoundingClientRect().top, 0);
  }
  return 0;
};

// A plain left click, the only one that changes the page in this tab.
const opensHere = (event: React.MouseEvent) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

interface ControlProps {
  // null when there is nowhere to go (the first page's Previous).
  page: number | null;
  label?: string;
  // The page on show: filled and aria-current, but the same element as the
  // other pages, so the one just pressed keeps focus as it becomes current.
  current?: boolean;
  className: string;
  hrefFor?: (page: number) => string;
  onGo: (page: number, event: React.MouseEvent) => void;
  children: React.ReactNode;
}

// One pager control: a link for a server list, a button otherwise. A dead
// link is a span marked aria-disabled, since an <a> cannot be disabled.
const Control = ({ page, label, current = false, className, hrefFor, onGo, children }: ControlProps) => {
  if (page === null) {
    return hrefFor ? (
      <span role="link" aria-disabled="true" aria-label={label} className={cn(className, OFF)}>
        {children}
      </span>
    ) : (
      <button type="button" disabled aria-label={label} className={cn(className, OFF)}>
        {children}
      </button>
    );
  }
  const look = cn(current ? CURRENT : IDLE, className);
  return hrefFor ? (
    <Link href={hrefFor(page)} scroll={false} aria-label={label} aria-current={current ? "page" : undefined} onClick={(event) => onGo(page, event)} className={look}>
      {children}
    </Link>
  ) : (
    <button type="button" aria-label={label} aria-current={current ? "page" : undefined} onClick={(event) => onGo(page, event)} className={look}>
      {children}
    </button>
  );
};

// The one pager every list uses: "Showing 1–20 of 54" on the left, the
// controls on the right, wrapping on narrow widths. The root is a size
// container, so below 35rem (a phone, a drawer, a narrow card) the numbered
// window folds into "‹ Page 3 of 12 ›" without any script. One page shows
// the summary only; an empty list shows nothing. It draws no border of its
// own; ListFooter (or the admin footer) does.
const Pagination = ({
  page,
  totalPages,
  total,
  pageSize,
  hrefFor,
  onPageChange,
  variant = "numbered",
  labels,
  summary,
  pageSizes,
  onPageSizeChange,
  focusTargetId,
  className,
}: PaginationProps) => {
  const { t, fmt } = useLocale();
  const model = pagerModel(page, totalPages, total, pageSize);
  const shownPage = model.current;
  // Set by a click here, so loading the page cold never steals focus.
  const moved = useRef(false);
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    const target = focusTargetId ? document.getElementById(focusTargetId) : null;
    if (target) {
      if (target.getBoundingClientRect().top < visibleTop(target)) {
        target.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      }
      const list = target.matches(LIST) ? target : (target.querySelector<HTMLElement>(LIST) ?? target);
      // A table or a card isn't focusable on its own.
      if (list.tabIndex < 0 && !list.hasAttribute("tabindex")) list.setAttribute("tabindex", "-1");
      list.focus({ preventScroll: true });
      return;
    }
    // No list to go to, and the control pressed has gone (Next on reaching
    // the last page, an ellipsis no longer needed) or died with it: keep
    // focus in the pager, or the next Tab starts from the top of the page.
    const focused = document.activeElement;
    if (!focused || focused === document.body || (focused instanceof HTMLButtonElement && focused.disabled)) {
      nav.current?.focus({ preventScroll: true });
    }
  }, [shownPage, focusTargetId]);

  if (model.empty) return null;

  const go = (target: number, event: React.MouseEvent) => {
    if (hrefFor && !opensHere(event)) return;
    // The page on show: nothing to load, and its URL is never fetched again.
    if (target === shownPage) {
      if (hrefFor) event.preventDefault();
      return;
    }
    moved.current = true;
    if (!hrefFor) onPageChange?.(target);
  };

  const figure = (text: string) => <b className="font-semibold text-ink">{text}</b>;
  const summaryNode =
    summary === false ? null : summary === undefined ? (
      <p>
        {fillNodes(t("Showing {range} of {total}"), {
          range: figure(toLocaleDigits(`${formatNumber(model.first)}–${formatNumber(model.last)}`, fmt)),
          total: figure(formatCount(total, fmt)),
        })}
      </p>
    ) : (
      <div className="min-w-0">{summary}</div>
    );

  // The choice stays while the list has more rows than the smallest size,
  // even on one page, so a reader who picked 50 can go back to 10.
  const sizes = pageSizes && pageSizes.length > 0 ? [...new Set([...pageSizes, pageSize])].sort((a, b) => a - b) : [];
  const sizePicker = onPageSizeChange && sizes.length > 1 && total > sizes[0] && (
    <label className="flex items-center gap-2">
      <span className="sr-only @[35rem]:not-sr-only">{t("Rows per page")}</span>
      <NativeSelect
        size="sm"
        value={pageSize}
        // No focus move here: arrowing through a closed select changes it
        // on every press, and focus must stay put while that happens.
        onChange={(event) => onPageSizeChange(Number(event.target.value))}
        className="h-8 rounded-full border-line pr-8 pl-3 text-small text-ink-2 pointer-coarse:h-11"
      >
        {sizes.map((size) => (
          <option key={size} value={size}>
            {formatCount(size, fmt)}
          </option>
        ))}
      </NativeSelect>
    </label>
  );

  const pageOf = t("Page {page} of {total}", { page: formatCount(shownPage, fmt), total: formatCount(model.totalPages, fmt) });
  const previousLabel = labels?.previous ?? t("Previous page");
  const nextLabel = labels?.next ?? t("Next page");

  return (
    <div className={cn("@container w-full", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-small text-ink-muted">
        {summaryNode}

        {(model.paged || sizePicker) && (
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
            {sizePicker}
            {/* The nav takes focus (tabIndex -1) when the control pressed goes away. */}
            {model.paged && variant === "simple" && (
              <nav ref={nav} tabIndex={-1} aria-label={t("Pagination")} className="flex items-center gap-2 rounded-md">
                <Control page={model.previous} className={TEXT} hrefFor={hrefFor} onGo={go}>
                  {previousLabel}
                </Control>
                <Control page={model.next} className={TEXT} hrefFor={hrefFor} onGo={go}>
                  {nextLabel}
                </Control>
              </nav>
            )}
            {model.paged && variant === "numbered" && (
              <nav ref={nav} tabIndex={-1} aria-label={t("Pagination")} className="flex items-center gap-1 rounded-md">
                <Control page={model.previous} label={previousLabel} className={ARROW} hrefFor={hrefFor} onGo={go}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Control>

                {/* 35rem and wider: the 7-slot window. */}
                <span className="hidden items-center gap-1 @[35rem]:flex">
                  {model.items.map((item) =>
                    item.kind === "jump" ? (
                      <Control
                        key={item.direction}
                        page={item.page}
                        label={t(item.direction === "earlier" ? "Earlier pages" : "Later pages")}
                        className={cn(ARROW, "border-transparent bg-transparent text-ink-muted")}
                        hrefFor={hrefFor}
                        onGo={go}
                      >
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      </Control>
                    ) : (
                      <Control
                        key={item.page}
                        page={item.page}
                        current={item.current}
                        // The page on show says where the reader is; the others where they'd go.
                        label={item.current ? pageOf : t("Go to page {page}", { page: formatCount(item.page, fmt) })}
                        className={SQUARE}
                        hrefFor={hrefFor}
                        onGo={go}
                      >
                        {formatCount(item.page, fmt)}
                      </Control>
                    ),
                  )}
                </span>

                {/* Narrower: "‹ Page 3 of 12 ›"; the live region says it. */}
                <span aria-hidden="true" className="px-2 font-medium whitespace-nowrap text-ink-2 tabular-nums @[35rem]:hidden">
                  {pageOf}
                </span>

                <Control page={model.next} label={nextLabel} className={ARROW} hrefFor={hrefFor} onGo={go}>
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Control>
              </nav>
            )}
          </div>
        )}
      </div>

      {model.paged && (
        <p aria-live="polite" className="sr-only">
          {pageOf}
        </p>
      )}
    </div>
  );
};

export default Pagination;
