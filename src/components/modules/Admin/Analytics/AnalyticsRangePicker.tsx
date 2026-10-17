"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AnalyticsRange } from "@/lib/analyticsRange";
import { rangeSpan } from "@/lib/analyticsWording";
import { cn } from "@/lib/utils";
import { useAnalyticsRange } from "./useAnalyticsRange";

const PRESETS = [
  { preset: "7", label: "7 days" },
  { preset: "30", label: "30 days" },
  { preset: "90", label: "90 days" },
] as const;

const SEGMENT = "h-7.5 rounded-sm px-3 text-small transition-colors";
const segmentState = (on: boolean) => (on ? "bg-forest font-semibold text-white" : "font-medium text-ink-2 hover:bg-surface-sunken hover:text-ink");

const CustomRangeForm = ({ range, today, onApply }: { range: AnalyticsRange; today: string; onApply: (from: string, to: string) => void }) => {
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const isValid = Boolean(from && to && from <= to && to <= today);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (isValid) onApply(from, to);
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="analytics-from">From</Label>
          <Input id="analytics-from" type="date" value={from} max={to || today} onChange={(event) => setFrom(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="analytics-to">To</Label>
          <Input id="analytics-to" type="date" value={to} min={from} max={today} onChange={(event) => setTo(event.target.value)} />
        </div>
      </div>
      <Button type="submit" size="sm" className="w-full" disabled={!isValid}>
        Apply range
      </Button>
    </form>
  );
};

// The page header's period: the dates it covers, then 7 / 30 / 90 days (and
// a custom range) in the design's forest-on-white switch. The range lives in
// the URL, so the charts below follow it.
const AnalyticsRangePicker = ({ today }: { today: string }) => {
  const { range, setRange } = useAnalyticsRange(today);
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-small text-ink-muted" aria-live="polite">
        {rangeSpan(range)}
      </span>
      <div role="group" aria-label="Period" className="inline-flex gap-0.5 rounded-md border border-line bg-surface p-0.75">
        {PRESETS.map(({ preset, label }) => (
          <button key={preset} type="button" aria-pressed={range.preset === preset} className={cn(SEGMENT, segmentState(range.preset === preset))} onClick={() => setRange({ preset })}>
            {label}
          </button>
        ))}
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <button type="button" aria-pressed={range.preset === "custom"} className={cn(SEGMENT, segmentState(range.preset === "custom"))}>
              Custom
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            {/* Remounted per range, so it opens on the current window. */}
            <CustomRangeForm
              key={`${range.from}:${range.to}`}
              range={range}
              today={today}
              onApply={(from, to) => {
                setRange({ preset: "custom", from, to });
                setIsCustomOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default AnalyticsRangePicker;
