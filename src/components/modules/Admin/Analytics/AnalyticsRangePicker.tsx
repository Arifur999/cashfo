"use client";

import { CalendarRange } from "lucide-react";
import { useState } from "react";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import SegmentedControl, { segmentClassName } from "@/components/smartly/SegmentedControl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type AnalyticsPreset, type AnalyticsRange, MAX_RANGE_DAYS, rangeDays } from "@/lib/analyticsRange";
import { rangeSpan } from "@/lib/analyticsWording";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useAnalyticsRange } from "./useAnalyticsRange";

const PRESETS: { value: AnalyticsPreset; label: string }[] = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

const CustomRangeForm = ({ range, today, onApply }: { range: AnalyticsRange; today: string; onApply: (from: string, to: string) => void }) => {
  const { translate, locale } = useLocale();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const ordered = Boolean(from && to && from <= to && to <= today);
  // The API takes a year at most; say so before Apply rather than after.
  const tooLong = ordered && rangeDays(from, to) > MAX_RANGE_DAYS;
  const isValid = ordered && !tooLong;

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
          <Label htmlFor="analytics-from">
            <T>From</T>
          </Label>
          <Input id="analytics-from" type="date" value={from} max={to || today} onChange={(event) => setFrom(event.target.value)} aria-describedby={tooLong ? "analytics-range-limit" : undefined} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="analytics-to">
            {/* "To" as the end of a range: the bare word reads otherwise in Bangla. */}
            <T>To@@date range</T>
          </Label>
          <Input id="analytics-to" type="date" value={to} min={from} max={today} onChange={(event) => setTo(event.target.value)} aria-describedby={tooLong ? "analytics-range-limit" : undefined} />
        </div>
      </div>
      {tooLong && (
        <p id="analytics-range-limit" role="status" className="text-small text-warning">
          {translate("Pick at most {count} days", { count: formatCount(MAX_RANGE_DAYS, locale) })}
        </p>
      )}
      <Button type="submit" variant="primary" size="sm" className="w-full" disabled={!isValid}>
        <T>Apply range</T>
      </Button>
    </form>
  );
};

// The page header's period: the dates it covers, then 7 / 30 / 90 days in
// the design's forest-on-white switch, with Custom as its last segment. The
// range lives in the URL, so the charts below follow it.
const AnalyticsRangePicker = ({ today }: { today: string }) => {
  const { range, setRange } = useAnalyticsRange(today);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const { locale } = useLocale();
  const custom = range.preset === "custom";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-small text-ink-muted" aria-live="polite">
        {rangeSpan(range, locale)}
      </span>
      {/* Custom sits in the row as its last segment. While a custom range is
          in force, value="custom" leaves 7 / 30 / 90 unpressed and Custom on.
          The popover adds no element of its own, so the trigger is the row's. */}
      <SegmentedControl
        label="Period"
        variant="solid"
        size="coarse"
        options={PRESETS}
        value={range.preset}
        onChange={(preset) => setRange({ preset })}
        trailing={
          <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
            <PopoverTrigger asChild>
              <button type="button" aria-pressed={custom} className={segmentClassName({ variant: "solid", size: "coarse", on: custom })}>
                <CalendarRange className="size-4" aria-hidden="true" />
                <T>Custom</T>
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
        }
      />
    </div>
  );
};

export default AnalyticsRangePicker;
