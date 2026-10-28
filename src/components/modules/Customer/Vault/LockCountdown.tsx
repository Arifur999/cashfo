"use client";

import { useEffect, useState } from "react";
import { countdownText } from "@/lib/customer/vaultDisplay";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface LockCountdownProps {
  // When the vault locks, in epoch milliseconds.
  expiresAt: number;
  // "bar": the line under the page's name in the phone top bar; "pill":
  // beside the desktop header's buttons.
  look: "bar" | "pill";
}

// "Unlocked · locks in 8:24". It ticks on its own, so the page around it
// isn't drawn again every second (the page itself only waits for the lock).
export function LockCountdown({ expiresAt, look }: LockCountdownProps) {
  const { t, fmt } = useLocale();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = toLocaleDigits(countdownText(expiresAt - now), fmt);
  return (
    <span
      role="timer"
      aria-label={t("Vault locks in {time}", { time })}
      className={cn("flex items-center tabular-nums", look === "bar" ? "gap-1 text-caption font-normal text-emerald" : "h-9.5 gap-2 rounded-full border border-emerald-line bg-emerald-soft px-3 text-small font-semibold text-brand-ink")}
    >
      <span className={cn("rounded-full bg-emerald", look === "bar" ? "size-1.75" : "size-2")} aria-hidden="true" />
      {t("Unlocked · locks in {time}", { time })}
    </span>
  );
}
