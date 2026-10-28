"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { dayText } from "@/lib/customer/habitDisplay";
import { parasOn, QURAN_PARAS, quranItem, quranKhatam, type RamadanDay, type RamadanWindow } from "@/lib/customer/ramadanDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { redigit } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface QuranKhatamCardProps {
  sheet: HabitMonthTracker;
  window: RamadanWindow;
  days: RamadanDay[];
  onParas: (day: number, paras: number) => void;
  saving: boolean;
}

// The board's Quran khatam card: the paras read so far out of thirty, one
// square each, and the day the khatam was finished. While Ramadan is going on
// it also logs a day's paras (today, or a day already past).
export function QuranKhatamCard({ sheet, window, days, onParas, saving }: QuranKhatamCardProps) {
  const { t, fmt } = useLocale();
  const [picked, setPicked] = useState<number | null>(null);
  const count = (n: number) => formatCount(n, fmt);
  const { read, finishedOn } = quranKhatam(sheet);
  const shown = Math.min(read, QURAN_PARAS);
  const finishedDate = finishedOn ? days.find((d) => d.day === finishedOn)?.date : null;
  const day = window.todayDay !== null ? Math.min(picked ?? window.todayDay, window.todayDay) : null;
  const paras = day !== null ? parasOn(sheet, day) : 0;
  const finishedLine = finishedOn ? (finishedDate ? t("Finished on {day} Ramadan ({date}).", { day: count(finishedOn), date: dayText(finishedDate, fmt, "dayMonthYear") }) : t("Finished on {day} Ramadan.", { day: count(finishedOn) })) : null;
  const step = "flex h-full w-8.5 items-center justify-center text-ink-2 hover:bg-surface-sunken disabled:opacity-40 pointer-coarse:w-11";

  return (
    <Card padding="none" className="flex min-w-0 flex-col gap-3 rounded-md px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-title font-semibold text-ink">{t("Quran khatam")}</h2>
        {finishedOn ? (
          <Chip tone="income" size="sm" className="px-2 text-[11.5px]">
            {t("Finished")}
          </Chip>
        ) : (
          <Chip tone="neutral" size="sm" className="px-2 text-[11.5px] text-ink-soft">
            {t("{count} paras to go", { count: count(QURAN_PARAS - shown) })}
          </Chip>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[30px] leading-[normal] font-bold tracking-[-0.02em] text-ink tabular-nums">{count(shown)}</span>
        <span className="text-body text-ink-soft">{redigit(t("of 30 paras"), fmt)}</span>
      </div>
      <div role="img" aria-label={shown === QURAN_PARAS ? t("All 30 paras read") : t("{count} of 30 paras read", { count: count(shown) })} className="grid grid-cols-10 gap-1">
        {Array.from({ length: QURAN_PARAS }, (_, i) => i + 1).map((para) => (
          <span key={para} title={t("Para {count}", { count: count(para) })} className={cn("flex h-5.5 items-center justify-center rounded-[4px] text-[10px] font-bold tabular-nums", para <= shown ? (finishedOn && para === QURAN_PARAS ? "bg-income text-on-action" : "bg-emerald text-on-action") : "bg-surface-sunken text-ink-muted")}>
            {count(para)}
          </span>
        ))}
      </div>

      {day !== null && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line bg-strip px-3 py-2">
          <label className="flex min-w-0 items-center gap-2 text-small font-semibold text-ink-2">
            {t("Paras on")}
            <NativeSelect size="sm" value={day} onChange={(event) => setPicked(Number(event.target.value))} aria-label={t("Day")}>
              {days
                .filter((d) => d.day <= (window.todayDay ?? 0))
                .reverse()
                .map((d) => (
                  <option key={d.day} value={d.day}>
                    {d.day === window.todayDay ? t("Today") : t("{day} Ramadan", { day: count(d.day) })}
                  </option>
                ))}
            </NativeSelect>
          </label>
          <span className="flex h-9 items-center overflow-hidden rounded-sm border border-input bg-surface pointer-coarse:h-11">
            <button type="button" aria-label={t("One para less")} disabled={saving || paras === 0} onClick={() => onParas(day, paras - 1)} className={step}>
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span aria-live="polite" className="w-9 border-x border-line text-center text-body-lg font-bold text-ink tabular-nums">
              {count(paras)}
            </span>
            <button type="button" aria-label={t("One para more")} disabled={saving || paras === QURAN_PARAS} onClick={() => onParas(day, paras + 1)} className={step}>
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </span>
        </div>
      )}

      <span className="mt-auto text-[12.5px] leading-normal text-ink-soft">
        {finishedLine && `${finishedLine} `}
        {quranItem(sheet.items) ? t("Log paras each day and the sheet ticks the Quran row for you.") : t("Log paras each day to count them towards a khatam.")}
      </span>
    </Card>
  );
}
