"use client";

import { format } from "date-fns";
import { CalendarRange } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { DateRangeValue } from "../dataTable.types";
import { FILTER_CHIP_CLASS } from "./DataTableFacetedFilter";

interface DataTableDateRangeFilterProps {
  title: string;
  value: DateRangeValue | undefined;
  onChange: (value: DateRangeValue | undefined) => void;
}

const formatDay = (day: string) => format(new Date(`${day}T00:00:00`), "MMM d, yyyy");

const describeRange = ({ from, to }: DateRangeValue, translate: (key: string) => string) => {
  if (from && to) return `${formatDay(from)} – ${formatDay(to)}`;
  if (from) return translate("From {date}").replace("{date}", formatDay(from));
  if (to) return translate("Until {date}").replace("{date}", formatDay(to));
  return "";
};

// Edits a draft and only applies on "Apply", so picking two dates fires one
// query instead of two.
const DataTableDateRangeFilter = ({ title, value, onChange }: DataTableDateRangeFilterProps) => {
  const { translate } = useLocale();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRangeValue>(value ?? {});
  const isActive = Boolean(value?.from || value?.to);
  const isInvalid = Boolean(draft.from && draft.to && draft.from > draft.to);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraft(value ?? {});
    }
    setOpen(nextOpen);
  };

  const apply = (next: DateRangeValue | undefined) => {
    onChange(next && (next.from || next.to) ? next : undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={FILTER_CHIP_CLASS}>
          <CalendarRange className="size-3.5 text-ink-muted" aria-hidden="true" />
          <span>{translate(title)}:</span>
          <b className="font-semibold text-ink">{isActive && value ? describeRange(value, translate) : translate("Any time")}</b>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="start">
        <div className="space-y-1.5">
          <Label htmlFor={`${title}-from`}>{translate("Start date")}</Label>
          <Input
            id={`${title}-from`}
            type="date"
            value={draft.from ?? ""}
            max={draft.to}
            onChange={(event) => setDraft((previous) => ({ ...previous, from: event.target.value || undefined }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${title}-to`}>{translate("End date")}</Label>
          <Input
            id={`${title}-to`}
            type="date"
            value={draft.to ?? ""}
            min={draft.from}
            onChange={(event) => setDraft((previous) => ({ ...previous, to: event.target.value || undefined }))}
          />
        </div>
        {isInvalid && <p className="text-xs text-destructive">{translate("The start must be on or before the end.")}</p>}
        <div className="flex justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => apply(undefined)}>
            {translate("Clear")}
          </Button>
          <Button size="sm" disabled={isInvalid} onClick={() => apply(draft)}>
            {translate("Apply")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DataTableDateRangeFilter;
