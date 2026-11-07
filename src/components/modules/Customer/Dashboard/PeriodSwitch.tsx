"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { DASHBOARD_PERIODS, isDay, type DashboardPeriodKey } from "./dashboardFigures";

const LABELS: Record<DashboardPeriodKey, string> = {
  "this-month": "This month",
  "last-month": "Last month",
  "this-year": "This year",
  custom: "Custom",
};

interface PeriodSwitchProps {
  value: DashboardPeriodKey;
  // The days on show, where Custom starts from.
  dateFrom: string;
  dateTo: string;
  today: string;
  // "bar": the desktop board's one pill holding all four; "chips": the
  // phone board's row of separate chips that scrolls sideways.
  variant: "bar" | "chips";
  className?: string;
}

// The period the Dashboard's figures cover, on the URL (?period=, and
// ?from=&to= for Custom) so a reload or a shared link keeps it. Custom asks
// for its two days in a small popover.
export function PeriodSwitch({ value, dateFrom, dateTo, today, variant, className }: PeriodSwitchProps) {
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState({ from: dateFrom, to: dateTo });

  const go = (key: DashboardPeriodKey, range?: { from: string; to: string }) => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("from");
    next.delete("to");
    // The desktop picker's words for a period.
    next.delete("month");
    next.delete("year");
    if (key === "this-month") next.delete("period");
    else next.set("period", key);
    if (range) {
      next.set("from", range.from);
      next.set("to", range.to);
    }
    const query = next.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  const valid = isDay(draft.from) && isDay(draft.to) && draft.from <= draft.to;
  const bar = variant === "bar";

  const button = (key: DashboardPeriodKey) => {
    const on = key === value;
    return (
      <button
        key={key}
        type="button"
        aria-pressed={on}
        onClick={key === "custom" ? undefined : () => go(key)}
        className={cn(
          "flex shrink-0 items-center rounded-full px-3.5 text-[13px] leading-[normal] whitespace-nowrap transition-colors",
          bar ? "h-8" : "h-9 border",
          on ? "bg-emerald font-semibold text-on-action" : "font-medium text-ink-soft hover:text-ink",
          !bar && (on ? "border-emerald" : "border-line bg-surface"),
          bar && !on && "hover:bg-surface-sunken",
        )}
      >
        {t(LABELS[key])}
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label={t("Period")}
      aria-busy={pending || undefined}
      className={cn(
        "flex transition-opacity",
        bar ? "gap-0.5 rounded-full border border-line-card bg-surface p-1" : "-mx-4 gap-2 overflow-x-auto px-4 [scrollbar-width:none]",
        pending && "opacity-70",
        className,
      )}
    >
      {DASHBOARD_PERIODS.filter((key) => key !== "custom").map(button)}
      <Popover
        open={customOpen}
        onOpenChange={(open) => {
          if (open) setDraft({ from: dateFrom, to: dateTo });
          setCustomOpen(open);
        }}
      >
        <PopoverTrigger asChild>{button("custom")}</PopoverTrigger>
        <PopoverContent align="end" className="w-76 gap-3 rounded-lg border border-line-card bg-surface p-4 shadow-overlay ring-0">
          <span className="text-body font-semibold text-ink">{t("Custom period")}</span>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!valid) return;
              setCustomOpen(false);
              go("custom", draft);
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-small text-ink-muted">
                {t("From")}
                <Input size="sm" type="date" value={draft.from} max={draft.to || today} onChange={(event) => setDraft((d) => ({ ...d, from: event.target.value }))} />
              </label>
              <label className="flex flex-col gap-1 text-small text-ink-muted">
                {t("To@@date")}
                <Input size="sm" type="date" value={draft.to} min={draft.from || undefined} onChange={(event) => setDraft((d) => ({ ...d, to: event.target.value }))} />
              </label>
            </div>
            <Button type="submit" size="sm" disabled={!valid} className="self-end">
              {t("Show")}
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
