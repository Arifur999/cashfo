"use client";

import { Check, CheckCheck, Clock3, X } from "lucide-react";
import Chip from "@/components/smartly/Chip";
import Kbd from "@/components/smartly/Kbd";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import type { PrayerStatus } from "@/lib/customer/api";
import { formatDate } from "@/lib/customer/date";
import type { CellState } from "@/lib/customer/namazDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const OPTIONS: { status: PrayerStatus; state: CellState; title: string; sub: string; tile: string; icon: React.ReactNode }[] = [
  { status: "JAMAAT", state: "jamaat", title: "With jama'at", sub: "Prayed in congregation. Jumu'ah counts here.", tile: "bg-emerald text-white", icon: <CheckCheck className="size-4" strokeWidth={2.5} /> },
  { status: "ON_TIME", state: "onTime", title: "On time", sub: "Prayed within its time", tile: "bg-emerald-tint text-emerald", icon: <Check className="size-4" strokeWidth={2.75} /> },
  { status: "QAZA", state: "qaza", title: "Qaza", sub: "Prayed after its time ended", tile: "bg-warning-soft text-warning", icon: <Clock3 className="size-4" strokeWidth={2.25} /> },
  { status: "MISSED", state: "missed", title: "Not prayed", sub: "Adds 1 to the qaza you owe", tile: "bg-rose-soft text-rose", icon: <X className="size-4" strokeWidth={2.75} /> },
];

interface PrayerStatusMenuProps {
  // The cell it opens from.
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prayer: string;
  // "YYYY-MM-DD" of the cell.
  day: string;
  // How the cell reads now; a past unmarked cell reads "missed" but has no
  // mark to clear.
  state: CellState;
  marked: boolean;
  // A status, or null to clear the mark.
  onPick: (status: PrayerStatus | null) => void;
}

// The board's "how was it prayed?" menu: with jama'at, on time, qaza or not
// prayed (keys 1 to 4), and Clear the mark. Each tap saves at once.
export function PrayerStatusMenu({ children, open, onOpenChange, prayer, day, state, marked, onPick }: PrayerStatusMenuProps) {
  const { t } = useLocale();
  const friday = new Date(`${day}T00:00:00.000Z`).getUTCDay() === 5;
  const title = `${t(prayer)} · ${formatDate(`${day}T00:00:00.000Z`, "EEEE, d MMM")}`;

  function onKeyDown(event: React.KeyboardEvent) {
    const option = OPTIONS[Number(event.key) - 1];
    if (option) {
      event.preventDefault();
      onPick(option.status);
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor className="flex shrink-0">{children}</PopoverAnchor>
      <PopoverContent align="start" sideOffset={8} onKeyDown={onKeyDown} aria-label={title} className="w-79 gap-0 rounded-lg border border-line bg-surface p-0 text-ink shadow-[0_16px_40px_rgba(14,26,22,0.2),0_2px_6px_rgba(14,26,22,0.08)] ring-0">
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
          <h2 className="text-title font-semibold">{title}</h2>
          {friday && prayer === "Dhuhr" && (
            <Chip tone="warning" size="sm" className="font-semibold">
              {t("Jumu'ah")}
            </Chip>
          )}
        </div>
        <div role="radiogroup" aria-label={t("How was {prayer} prayed?", { prayer: t(prayer) })} className="flex flex-col gap-0.5 px-2 pb-2">
          {OPTIONS.map((option, index) => {
            const on = marked && state === option.state;
            return (
              <button key={option.status} type="button" role="radio" aria-checked={on} onClick={() => onPick(option.status)} className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors", on ? "bg-mint-50" : "hover:bg-hover")}>
                <span aria-hidden="true" className={cn("flex size-7 shrink-0 items-center justify-center rounded-sm", option.tile)}>
                  {option.icon}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="text-body font-semibold">{t(option.title)}</span>
                  <span className="text-caption text-ink-muted">{t(option.sub)}</span>
                </span>
                <Kbd className="rounded-[4px] py-px font-sans text-caption font-semibold text-ink-muted">{index + 1}</Kbd>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-divider px-4 py-3 text-small">
          <button type="button" disabled={!marked} onClick={() => onPick(null)} className="font-semibold text-ink-2 hover:text-ink disabled:opacity-50">
            {t("Clear the mark")}
          </button>
          <span className="text-ink-muted">{t("Saved as you tap")}</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
