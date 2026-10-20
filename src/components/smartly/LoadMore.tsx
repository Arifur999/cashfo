"use client";

import { useEffect, useRef, useState } from "react";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import Button from "./Button";

interface LoadMoreProps {
  shown: number;
  total: number;
  // How many one press adds.
  step: number;
  onMore: () => void;
  // Pass it once the list has grown: with everything shown, the button
  // turns into "Show fewer".
  onLess?: () => void;
  // Where focus goes when the last press takes the button away: the first
  // row it revealed, say, or the list (a ListCard's id means its table).
  // Without one, focus stays on the count.
  focusTargetId?: string;
  className?: string;
}

// Inside a focusTargetId, focus goes to the table, not the card around it.
const LIST = "table, [role=table]";

// The footer of a list that grows in place (People & banks, completed
// to-dos): "Showing 24 of 130" and "Show 24 more". The sentence is a live
// region, so a screen reader hears the new count while focus stays on the
// button. Once everything is shown with no onLess, the button goes but the
// count stays, so the last one is still heard; a list that never grew shows
// nothing. Draws no border of its own; ListFooter does.
const LoadMore = ({ shown, total, step, onMore, onLess, focusTargetId, className }: LoadMoreProps) => {
  const { t, locale } = useLocale();
  const root = useRef<HTMLDivElement>(null);
  // The total this button grew the list to. Kept against the total, so a
  // new list that fits from the start (another filter) shows nothing again.
  const [grewTo, setGrewTo] = useState<number | null>(null);
  // Set by the press that shows the last rows.
  const finishing = useRef(false);
  const everything = shown >= total;
  const ended = everything && !onLess;

  useEffect(() => {
    if (!ended || !finishing.current) return;
    finishing.current = false;
    // Only if the button took focus with it: a reader who has moved on
    // (while the rows loaded, say) keeps their place.
    if (document.activeElement && document.activeElement !== document.body) return;
    const node = focusTargetId ? document.getElementById(focusTargetId) : null;
    const target = node?.matches(LIST) ? node : (node?.querySelector<HTMLElement>(LIST) ?? node ?? root.current);
    if (!target) return;
    if (target.tabIndex < 0 && !target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus();
  }, [ended, focusTargetId]);

  if (total <= 0 || (ended && grewTo !== total)) return null;

  const figure = (value: number) => <b className="font-semibold text-ink">{formatCount(value, locale)}</b>;
  const more = Math.max(Math.min(step, total - shown), 0);

  const showMore = () => {
    finishing.current = shown + more >= total;
    setGrewTo(total);
    onMore();
  };

  return (
    // tabIndex -1 once the button has gone: focus can wait on the count.
    <div ref={root} tabIndex={ended ? -1 : undefined} className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-small text-ink-muted", className)}>
      <p aria-live="polite">{fillNodes(t("Showing {shown} of {total}"), { shown: figure(Math.min(shown, total)), total: figure(total) })}</p>
      {!ended && (
        // One button for both words, so focus stays on it when they swap.
        <Button variant="secondary" size="sm" onClick={everything ? onLess : showMore} className="ml-auto pointer-coarse:h-11">
          {everything ? t("Show fewer") : t("Show {count} more", { count: formatCount(more, locale) })}
        </Button>
      )}
    </div>
  );
};

export default LoadMore;
