"use client";

import { Lock, LockKeyholeOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { countdownText } from "@/lib/customer/vaultDisplay";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The last minute turns the timer amber.
const LAST_MINUTE_MS = 60_000;

// The time left, ticking on its own, so the page around it isn't drawn
// again every second (the page itself only waits for the lock).
function useTimeLeft(expiresAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return expiresAt - now;
}

// "Unlocked · locks in 8:24" as the line under the page's name in the
// phone's top bar.
export function LockCountdown({ expiresAt }: { expiresAt: number }) {
  const { t, fmt } = useLocale();
  const left = useTimeLeft(expiresAt);
  const time = toLocaleDigits(countdownText(left), fmt);
  const late = left <= LAST_MINUTE_MS;
  return (
    <span role="timer" aria-label={t("Vault locks in {time}", { time })} className={cn("flex items-center gap-1 text-caption font-normal whitespace-nowrap tabular-nums", late ? "text-warning" : "text-emerald")}>
      <span className={cn("size-1.75 rounded-full", late ? "bg-warning" : "bg-emerald")} aria-hidden="true" />
      {t("Unlocked · locks in {time}", { time })}
    </span>
  );
}

// The header's one pill (design VaultHome): the timer, then Lock now. It
// turns amber in the last minute.
export function LockPill({ expiresAt, onLock }: { expiresAt: number; onLock: () => void }) {
  const { t, fmt } = useLocale();
  const left = useTimeLeft(expiresAt);
  const time = toLocaleDigits(countdownText(left), fmt);
  const late = left <= LAST_MINUTE_MS;
  return (
    <div role="group" aria-label={t("Vault lock")} className={cn("flex h-10 items-center overflow-hidden rounded-full border", late ? "border-warning-line bg-warning-soft" : "border-emerald-line bg-emerald-soft")}>
      <span role="timer" aria-label={t("Vault locks in {time}", { time })} className={cn("flex items-center gap-2 pr-3 pl-3.5 text-[13px] font-semibold whitespace-nowrap tabular-nums", late ? "text-warning" : "text-brand-ink")}>
        <LockKeyholeOpen className="size-3.75" strokeWidth={2.25} aria-hidden="true" />
        {t("Unlocked · locks in {time}", { time })}
      </span>
      <span aria-hidden="true" className={cn("h-5 w-px", late ? "bg-warning-line" : "bg-emerald-line")} />
      <button type="button" onClick={onLock} className="flex h-full items-center gap-1.5 bg-surface pr-3.5 pl-3 text-[13.5px] font-semibold whitespace-nowrap text-ink hover:bg-surface-sunken">
        <Lock className="size-3.75 text-ink-soft" strokeWidth={2.25} aria-hidden="true" />
        {t("Lock now")}
      </button>
    </div>
  );
}
