"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import PinBoxes from "@/components/smartly/PinBoxes";
import { setDiaryPinAction } from "@/lib/customer/writingActions";
import { DIARY_PIN_LENGTH } from "@/lib/customer/writingDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface DiaryPinDialogProps {
  // "set": the first PIN, asked when an entry first turns private.
  // "change": a new PIN with the account password (also "Forgot PIN?").
  mode: null | "set" | "change";
  onClose: () => void;
  onDone: () => void;
}

// The diary PIN: four digits, typed twice. A new PIN in place of the old
// one needs the account password, which someone merely holding the
// signed-in phone doesn't know. The diary is open once it is set.
export function DiaryPinDialog({ mode, onClose, onDone }: DiaryPinDialogProps) {
  return mode ? <PinForm key={mode} mode={mode} onClose={onClose} onDone={onDone} /> : null;
}

function PinForm({ mode, onClose, onDone }: { mode: "set" | "change"; onClose: () => void; onDone: () => void }) {
  const { t } = useLocale();
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const change = mode === "change";
  const mismatch = again.length === DIARY_PIN_LENGTH && again !== pin;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (pin.length < DIARY_PIN_LENGTH || again !== pin || (change && !password)) return;
    startTransition(async () => {
      const result = await setDiaryPinAction(pin, change ? password : undefined);
      if (!result.success) {
        setError(t(result.message ?? "Failed to set the PIN"));
        return;
      }
      toast.success(t(change ? "Diary PIN changed" : "Diary PIN set. Private entries now need it."));
      onDone();
    });
  };

  return (
    <PopupDialog
      open
      onClose={onClose}
      busy={isPending}
      width={420}
      title={t(change ? "Change your diary PIN" : "Set a diary PIN")}
      sub={t(change ? "Enter your account password, then a new PIN." : "Private entries open only with this PIN.")}
      onSubmit={submit}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending || pin.length < DIARY_PIN_LENGTH || again !== pin || (change && !password)}>
            {t(change ? "Change PIN" : "Set PIN")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {change && (
          <Field htmlFor="diary-password" label={t("Account password")}>
            <Input
              id="diary-password"
              type="password"
              size="md"
              autoComplete="current-password"
              value={password}
              autoFocus
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
            />
          </Field>
        )}
        <div className="flex flex-col gap-1">
          <span className="text-small font-semibold text-ink-2">{t("New PIN")}</span>
          <PinBoxes value={pin} maxLength={DIARY_PIN_LENGTH} label={t("New PIN")} autoFocus={!change} onChange={(value) => setPin(value)} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-small font-semibold text-ink-2">{t("Type it again")}</span>
          <PinBoxes value={again} maxLength={DIARY_PIN_LENGTH} label={t("Type it again")} invalid={mismatch} onChange={(value) => setAgain(value)} />
          {mismatch && <p className="text-center text-small text-expense">{t("The two PINs don't match.")}</p>}
        </div>
        {error && (
          <p role="alert" className="text-small text-expense">
            {error}
          </p>
        )}
      </div>
    </PopupDialog>
  );
}
