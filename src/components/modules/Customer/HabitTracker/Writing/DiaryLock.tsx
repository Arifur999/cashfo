"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import PinBoxes from "@/components/smartly/PinBoxes";
import { unlockDiaryAction } from "@/lib/customer/writingActions";
import { countdownText } from "@/lib/customer/vaultDisplay";
import { DIARY_PIN_LENGTH } from "@/lib/customer/writingDisplay";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface DiaryLockProps {
  // "Monday 28 September".
  dayLabel: string;
  onUnlocked: () => void;
  onForgot: () => void;
}

// A private day while the diary is locked (the board's lock panel): the
// diary PIN opens every private day for this sign-in.
export function DiaryLock({ dayLabel, onUnlocked, onForgot }: DiaryLockProps) {
  const { t, fmt } = useLocale();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const unlock = (value = pin) => {
    if (value.length < DIARY_PIN_LENGTH || isPending) return;
    startTransition(async () => {
      const result = await unlockDiaryAction(value);
      if (result.success) {
        toast.success(t("Diary unlocked for this session"));
        onUnlocked();
        return;
      }
      setPin("");
      if (result.reason === "PIN_WRONG") {
        setError(result.triesLeft !== undefined && result.triesLeft <= 3 ? t("Wrong PIN. {count} tries left.", { count: formatCount(result.triesLeft, fmt) }) : t("Wrong PIN. Try again."));
      } else if (result.reason === "TOO_MANY_TRIES" && result.retryAfterSec) {
        setError(t("Too many wrong tries. You can try again in {time}.", { time: toLocaleDigits(countdownText(result.retryAfterSec * 1000), fmt) }));
      } else setError(t(result.message ?? "Failed to unlock the diary"));
    });
  };

  return (
    <div className="m-auto flex w-full max-w-75 flex-col items-center gap-3 py-8 text-center">
      <span aria-hidden="true" className="text-[40px]">
        🔒
      </span>
      <h2 className="text-[17px] font-semibold text-ink">{t("{day} is private", { day: dayLabel })}</h2>
      <p className="text-small text-ink-muted">{t("Enter your diary PIN to read it.")}</p>
      <PinBoxes
        value={pin}
        maxLength={DIARY_PIN_LENGTH}
        label={t("Diary PIN")}
        autoFocus
        invalid={!!error}
        disabled={isPending}
        onChange={(value) => {
          setPin(value);
          setError(null);
          if (value.length === DIARY_PIN_LENGTH) unlock(value);
        }}
        onSubmit={() => unlock()}
      />
      {error && (
        <p role="alert" className="text-small text-expense">
          {error}
        </p>
      )}
      <Button className="w-full" onClick={() => unlock()} disabled={pin.length < DIARY_PIN_LENGTH || isPending}>
        {t("Unlock")}
      </Button>
      <button type="button" onClick={onForgot} className="rounded-sm text-small font-semibold text-emerald hover:underline">
        {t("Forgot PIN?")}
      </button>
    </div>
  );
}
