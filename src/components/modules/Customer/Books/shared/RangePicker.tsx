"use client";

import Input from "@/components/smartly/form/Input";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { formatDate } from "@/lib/customer/date";
import type { DateRangePreset } from "@/lib/customer/dateRangePresets";
import { useLocale } from "@/lib/i18n/LocaleProvider";

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
  onChange: (next: RangeChange) => void;
}

// "1 Sep – 2 Oct 2026": the span the figures cover, in words.
export function rangeText(from: string | undefined, to: string | undefined, allTime: string): string {
  if (!from && !to) return allTime;
  if (from && to) return `${formatDate(from, from.slice(0, 4) === to.slice(0, 4) ? "d MMM" : "d MMM yyyy")} – ${formatDate(to, "d MMM yyyy")}`;
  return formatDate((from ?? to) as string, "d MMM yyyy");
}

// The period a statement covers: the five presets and, for Custom, two dates.
export function RangePicker({ value, from, to, customFrom, customTo, onChange }: RangePickerProps) {
  const { t } = useLocale();
  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <SegmentedControl label={t("Period")} value={value} onChange={(range) => onChange(range === "custom" ? { range } : { range, dateFrom: undefined, dateTo: undefined })} options={PRESETS.map((preset) => ({ value: preset.value, label: t(preset.label) }))} className="max-sm:w-full max-sm:overflow-x-auto" />
      {value === "custom" ? (
        <div className="flex items-center gap-2">
          <Input size="sm" type="date" value={customFrom ?? ""} onChange={(event) => onChange({ range: "custom", dateFrom: event.target.value || undefined })} aria-label={t("From")} max={customTo} />
          <span className="text-small text-ink-muted">{t("to")}</span>
          <Input size="sm" type="date" value={customTo ?? ""} onChange={(event) => onChange({ range: "custom", dateTo: event.target.value || undefined })} aria-label={t("To")} min={customFrom} />
        </div>
      ) : (
        <span className="text-small text-ink-muted">{rangeText(from, to, t("Since the first entry"))}</span>
      )}
    </div>
  );
}
