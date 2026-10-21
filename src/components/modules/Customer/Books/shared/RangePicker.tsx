"use client";

import { useState } from "react";
import Input from "@/components/smartly/form/Input";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { booksRange } from "@/lib/customer/booksDisplay";
import { isIsoDay, resolveDateRange, type DateRangePreset } from "@/lib/customer/dateRangePresets";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-year", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

export interface RangeChange {
  range?: DateRangePreset;
  dateFrom?: string;
  dateTo?: string;
}

interface RangePickerProps {
  value: DateRangePreset;
  // The days the preset resolved to; both empty for all time.
  from?: string;
  to?: string;
  customFrom?: string;
  customTo?: string;
  // The page is loading the new period: the control is set back meanwhile.
  busy?: boolean;
  onChange: (next: RangeChange) => void;
}

// A day typed in full: a date field reports "0002-10-21" while the year is
// still being typed, which must not load a period.
const usableDay = (day: string) => day === "" || (isIsoDay(day) && Number(day.slice(0, 4)) >= 1900);

// The period a statement covers: the five presets and, for Custom, two dates.
// Custom starts from the period on show (this month after All time), so the
// figures never jump to all time under two empty fields. The two dates are
// kept here while they are typed and only load once complete, when the
// field is left or Enter is pressed: one history entry per date, not one per
// keystroke, and the field doesn't snap back while the page loads.
export function RangePicker({ value, from, to, customFrom, customTo, busy = false, onChange }: RangePickerProps) {
  const { t, locale } = useLocale();
  const applied = `${customFrom ?? ""}|${customTo ?? ""}`;
  const [draft, setDraft] = useState({ from: customFrom ?? "", to: customTo ?? "" });
  // The dates last sent, so leaving a field after Enter doesn't load twice.
  const [sent, setSent] = useState(applied);
  const [seen, setSeen] = useState(applied);
  if (applied !== seen) {
    setSeen(applied);
    setSent(applied);
    setDraft({ from: customFrom ?? "", to: customTo ?? "" });
  }

  function pick(range: DateRangePreset) {
    if (range !== "custom") {
      onChange({ range, dateFrom: undefined, dateTo: undefined });
      return;
    }
    // A click, so reading today's date here is safe.
    const start = from || to ? { dateFrom: from, dateTo: to } : resolveDateRange("this-month");
    onChange({ range, dateFrom: start.dateFrom, dateTo: start.dateTo });
  }

  function commit(next: { from: string; to: string }) {
    if (!usableDay(next.from) || !usableDay(next.to)) return;
    const key = `${next.from}|${next.to}`;
    if (key === sent) return;
    setSent(key);
    onChange({ range: "custom", dateFrom: next.from || undefined, dateTo: next.to || undefined });
  }

  const field = (side: "from" | "to") => ({
    value: draft[side],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setDraft((current) => ({ ...current, [side]: event.target.value })),
    onBlur: () => commit(draft),
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commit(draft);
      }
    },
  });

  return (
    <div aria-busy={busy || undefined} className={cn("flex flex-wrap items-center gap-3 transition-opacity print:hidden", busy && "opacity-60")}>
      {/* Wraps onto a second row on a phone rather than hiding Custom off screen. */}
      <SegmentedControl label={t("Period")} value={value} onChange={pick} options={PRESETS.map((preset) => ({ value: preset.value, label: t(preset.label) }))} className="max-sm:flex max-sm:w-full max-sm:flex-wrap" />
      {value === "custom" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input size="sm" type="date" {...field("from")} aria-label={t("From")} max={draft.to || undefined} />
          <span className="text-small text-ink-muted">{t("to")}</span>
          <Input size="sm" type="date" {...field("to")} aria-label={t("To@@date")} min={draft.from || undefined} />
        </div>
      ) : (
        <span className="text-small text-ink-muted">{booksRange(from, to, locale) ?? t("Since the first entry")}</span>
      )}
    </div>
  );
}
