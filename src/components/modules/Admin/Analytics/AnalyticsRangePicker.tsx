"use client";

import { CalendarRange } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AnalyticsRange } from "@/lib/analyticsRange";
import { formatDate } from "@/lib/date";
import type { AnalyticsRangeChange } from "./useAnalyticsRange";

const PRESETS = [
  { preset: "7", label: "7 days" },
  { preset: "30", label: "30 days" },
  { preset: "90", label: "90 days" },
] as const;

interface AnalyticsRangePickerProps {
  range: AnalyticsRange;
  today: string;
  onChange: (change: AnalyticsRangeChange) => void;
  isUpdating?: boolean;
}

// Days are calendar dates, so format them as UTC midnight (no shifting).
const dayLabel = (day: string) => formatDate(`${day}T12:00:00Z`);

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

const AnalyticsRangePicker = ({ range, today, onChange, isUpdating = false }: AnalyticsRangePickerProps) => {
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Date range" className="flex flex-wrap gap-1 rounded-full bg-muted p-1">
        {PRESETS.map(({ preset, label }) => (
          <Button
            key={preset}
            size="sm"
            variant={range.preset === preset ? "default" : "ghost"}
            aria-pressed={range.preset === preset}
            className="h-7"
            onClick={() => onChange({ preset })}
          >
            {label}
          </Button>
        ))}
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant={range.preset === "custom" ? "default" : "ghost"} aria-pressed={range.preset === "custom"} className="h-7">
              <CalendarRange aria-hidden="true" /> Custom
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80">
            {/* Remounted per range, so it opens on the current window. */}
            <CustomRangeForm
              key={`${range.from}:${range.to}`}
              range={range}
              today={today}
              onApply={(from, to) => {
                onChange({ preset: "custom", from, to });
                setIsCustomOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {dayLabel(range.from)} &ndash; {dayLabel(range.to)}
        {isUpdating && <span className="ml-2 animate-pulse">Updating...</span>}
      </p>
    </div>
  );
};

export default AnalyticsRangePicker;
