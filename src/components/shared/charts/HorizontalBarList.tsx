"use client";

import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import T from "../T";

export interface BarListItem {
  label: string;
  value: number;
  // Unit shown after the value, e.g. "users".
  unit?: string;
}

interface HorizontalBarListProps {
  items: BarListItem[];
  emptyMessage?: string;
}

// Ranked bars relative to the largest value, on the design's tokens: an
// emerald fill on the sunken track, counts in the reader's digits. Plain
// HTML (no chart library) keeps it light and readable by screen readers as
// a list of label/value pairs.
const HorizontalBarList = ({ items, emptyMessage = "No data for this period." }: HorizontalBarListProps) => {
  const { locale } = useLocale();
  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-small text-ink-muted">
        <T>{emptyMessage}</T>
      </p>
    );
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3">
          <span className="w-36 shrink-0 truncate text-small text-ink-2" title={item.label}>
            {item.label}
          </span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
            <span className="block h-full rounded-full bg-emerald transition-[width]" style={{ width: `${(item.value / max) * 100}%` }} />
          </span>
          <span className="w-20 shrink-0 text-right text-small font-semibold text-ink tabular-nums">
            {formatCount(item.value, locale)}
            {item.unit && (
              <>
                {" "}
                <T>{item.unit}</T>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
};

export default HorizontalBarList;
