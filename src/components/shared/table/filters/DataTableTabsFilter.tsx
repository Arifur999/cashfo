"use client";

import SegmentedControl from "@/components/smartly/SegmentedControl";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { asStatus } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
import type { DataTableTabOption } from "../dataTable.types";
import { useSideScrollFades } from "./useSideScrollFades";

interface DataTableTabsFilterProps {
  label: string;
  options: DataTableTabOption[];
  allLabel?: string;
  tone?: "bordered" | "sunken";
  // The tab an empty value means; there's no All tab then.
  defaultValue?: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

const ALL = "";

const tab = (text: string, count: number | undefined, locale: Locale) => (
  <>
    {text}
    {count !== undefined && <span className="font-normal text-ink-muted">{formatCount(count, locale)}</span>}
  </>
);

// "All 1,284 · Active 1,251 · Suspended 21 · Deleted 12": the design's status
// tabs in an outlined pill, the All tab summing the others, the counts in the
// reader's digits. Tabs wider than the toolbar (a phone's) scroll sideways
// inside it instead of running off the card.
const DataTableTabsFilter = ({ label, options, allLabel = "All", tone = "bordered", defaultValue, value, onChange }: DataTableTabsFilterProps) => {
  const { translate, locale } = useLocale();
  const current = value ?? defaultValue ?? ALL;
  const { ref, style } = useSideScrollFades<HTMLDivElement>(current);
  const hasCounts = options.some((option) => option.count !== undefined);
  const total = options.reduce((sum, option) => sum + (option.count ?? 0), 0);

  return (
    // The scroller's 4px padding, given back by its margin, keeps the
    // tabs' focus ring clear of its clipped edge.
    <div ref={ref} style={style} className="-m-1 flex max-w-full overflow-x-auto p-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
      <SegmentedControl
        label={label}
        variant="tabs"
        className={tone === "bordered" ? "border border-line bg-surface-sunken" : undefined}
        options={[
          ...(defaultValue ? [] : [{ value: ALL, label: tab(translate(allLabel), hasCounts ? total : undefined, locale) }]),
          ...options.map((option) => ({ value: option.value, label: tab(translate(asStatus(option.label)), option.count, locale) })),
        ]}
        value={current}
        // The default tab keeps the URL clean.
        onChange={(next) => onChange(next === ALL || next === defaultValue ? undefined : next)}
      />
    </div>
  );
};

export default DataTableTabsFilter;
