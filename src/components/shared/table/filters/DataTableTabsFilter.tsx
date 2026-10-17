"use client";

import SegmentedControl from "@/components/smartly/SegmentedControl";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/number";
import type { DataTableTabOption } from "../dataTable.types";
import { asStatus } from "@/lib/i18n/message";

interface DataTableTabsFilterProps {
  label: string;
  options: DataTableTabOption[];
  allLabel?: string;
  tone?: "cream" | "sunken";
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

const ALL = "";

const tab = (text: string, count: number | undefined) => (
  <>
    {text}
    {count !== undefined && <span className="font-normal text-ink-muted">{formatNumber(count)}</span>}
  </>
);

// "All 1,284 · Active 1,251 · Suspended 21 · Deleted 12": the design's status
// tabs in a cream pill, the All tab summing the others.
const DataTableTabsFilter = ({ label, options, allLabel = "All", tone = "cream", value, onChange }: DataTableTabsFilterProps) => {
  const { translate } = useLocale();
  const hasCounts = options.some((option) => option.count !== undefined);
  const total = options.reduce((sum, option) => sum + (option.count ?? 0), 0);

  return (
    <SegmentedControl
      label={label}
      variant="tabs"
      className={tone === "cream" ? "border border-line bg-cream" : undefined}
      options={[
        { value: ALL, label: tab(translate(allLabel), hasCounts ? total : undefined) },
        ...options.map((option) => ({ value: option.value, label: tab(translate(asStatus(option.label)), option.count) })),
      ]}
      value={value ?? ALL}
      onChange={(next) => onChange(next === ALL ? undefined : next)}
    />
  );
};

export default DataTableTabsFilter;
