"use client";

import { CalendarRange } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n/translate";
import type { DateRangeValue, FilterChipShape } from "../dataTable.types";
import { filterChipClass } from "./DataTableFacetedFilter";

interface DataTableDateRangeFilterProps {
  title: string;
  chip?: FilterChipShape;
  value: DateRangeValue | undefined;
  onChange: (value: DateRangeValue | undefined) => void;
}

// "Oct 2, 2026" ("অক্টো ২, ২০২৬" in Bangla). Noon UTC is the same calendar
// day in the platform timezone, so the picked day never shifts.
const formatDay = (day: string, locale: Locale) => formatDate(`${day}T12:00:00Z`, "MMM d, yyyy", "—", locale);

const describeRange = ({ from, to }: DateRangeValue, translate: (key: string) => string, locale: Locale) => {
  if (from && to) return `${formatDay(from, locale)} – ${formatDay(to, locale)}`;
  if (from) return translate("From {date}").replace("{date}", formatDay(from, locale));
  if (to) return translate("Until {date}").replace("{date}", formatDay(to, locale));
  return "";
};

// Edits a draft and only applies on "Apply", so picking two dates fires one
// query instead of two.
const DataTableDateRangeFilter = ({ title, chip, value, onChange }: DataTableDateRangeFilterProps) => {
  const { translate, locale } = useLocale();
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
        <Button variant="secondary" size="sm" className={filterChipClass(chip)}>
          <CalendarRange className="size-3.5 text-ink-muted" aria-hidden="true" />
          <span>{translate(title)}:</span>
          <b className="font-semibold text-ink">{isActive && value ? describeRange(value, translate, locale) : translate("Any time")}</b>
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
        {isInvalid && <p className="text-caption text-expense">{translate("The start must be on or before the end.")}</p>}
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
