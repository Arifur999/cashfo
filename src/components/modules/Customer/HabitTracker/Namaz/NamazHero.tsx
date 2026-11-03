"use client";

import { RefreshCw } from "lucide-react";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import { MosqueIcon } from "@/components/smartly/icons";
import { useMinuteClock } from "@/hooks/useMinuteClock";
import { timeLabel } from "@/lib/customer/date";
import { shiftDay } from "@/lib/customer/habitDisplay";
import { clockOf, methodShort, minutesUntil, nextPrayer } from "@/lib/customer/prayerTimes";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface NamazHeroProps {
  today: string;
  // The board's three figures: today so far, the all-five streak, this month.
  chips: { label: string; value: string }[];
  onSettings: () => void;
  // This month's sheet could not be opened: say so, with a retry.
  openFailed?: boolean;
  onRetry?: () => void;
}

// The NamazHome board's banner: the next prayer with its countdown and
// where the times come from, and today's, the streak's and the month's
// figures beside it.
export function NamazHero({ today, chips, onSettings, openFailed = false, onRetry }: NamazHeroProps) {
  const { t, fmt } = useLocale();
  const { settings } = usePrayerSettings();
  const now = useMinuteClock();
  const count = (n: number) => formatCount(n, fmt);
  const next = now ? nextPrayer(settings, today, shiftDay(today, 1), now) : null;
  const left = next && now ? minutesUntil(next.at, now) : null;
  const wait = left === null ? null : left < 60 ? t("in {minutes} minutes", { minutes: count(left) }) : t("in {hours} h {minutes} min", { hours: count(Math.floor(left / 60)), minutes: count(left % 60) });

  return (
    <section aria-labelledby="next-title" className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-[14px] bg-linear-to-br from-emerald to-forest px-6 py-4.5 text-white shadow-[0_8px_24px_rgba(15,118,110,0.25)] dark:text-on-action">
      <span className="flex size-13 shrink-0 items-center justify-center rounded-[14px] bg-white/14" aria-hidden="true">
        <MosqueIcon className="size-6.5" />
      </span>
      <div className="flex min-w-0 flex-1 basis-72 flex-col gap-0.75">
        <span id="next-title" className="text-caption font-semibold tracking-[0.06em] uppercase opacity-85">
          {t("Next prayer")}
        </span>
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{next ? t(next.prayer) : " "}</span>
          <span className="text-[18px] font-semibold tabular-nums opacity-95">{next ? timeLabel(clockOf(next.at), t, fmt) : ""}</span>
          {wait && <span className="inline-flex h-6.5 items-center rounded-full bg-white/18 px-2.5 text-small font-semibold">{wait}</span>}
        </span>
        <span className="text-[12.5px] opacity-85">
          {t(settings.city)} · {t("{method} method", { method: t(methodShort(settings.method)) })} · {t(settings.asrSchool === "HANAFI" ? "Hanafi Asr" : "Shafi'i Asr")} ·{" "}
          <button type="button" onClick={onSettings} className="font-semibold underline pointer-coarse:min-h-11">
            {t("Change")}
          </button>
        </span>
        {openFailed && (
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-small font-semibold">
            {t("Couldn't open this month's sheet")}
            {onRetry && (
              <button type="button" onClick={onRetry} className="flex min-h-9 items-center gap-1 underline">
                <RefreshCw className="size-4" aria-hidden="true" />
                {t("Try again")}
              </button>
            )}
          </span>
        )}
      </div>
      <div className="grid w-full grid-cols-3 gap-2.5 sm:flex sm:w-auto">
        {chips.map((chip) => (
          <div key={chip.label} className={cn("flex min-w-0 flex-col gap-0.5 rounded-[12px] border border-white/18 bg-white/12 px-3.5 py-2.5 sm:min-w-33")}>
            <span className="truncate text-caption opacity-85">{chip.label}</span>
            <span className="truncate text-[20px] font-bold tabular-nums">{chip.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
