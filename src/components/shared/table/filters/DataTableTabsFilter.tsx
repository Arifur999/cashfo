"use client";

import SegmentedControl from "@/components/smartly/SegmentedControl";
import { formatNumber } from "@/lib/number";
import type { DataTableTabOption } from "../dataTable.types";

interface DataTableTabsFilterProps {
  label: string;
  options: DataTableTabOption[];
  allLabel?: string;
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
const DataTableTabsFilter = ({ label, options, allLabel = "All", value, onChange }: DataTableTabsFilterProps) => {
  const hasCounts = options.some((option) => option.count !== undefined);
  const total = options.reduce((sum, option) => sum + (option.count ?? 0), 0);

  return (
    <SegmentedControl
      label={label}
      variant="tabs"
      className="border border-line bg-cream"
      options={[
        { value: ALL, label: tab(allLabel, hasCounts ? total : undefined) },
        ...options.map((option) => ({ value: option.value, label: tab(option.label, option.count) })),
      ]}
      value={value ?? ALL}
      onChange={(next) => onChange(next === ALL ? undefined : next)}
    />
  );
};

export default DataTableTabsFilter;
