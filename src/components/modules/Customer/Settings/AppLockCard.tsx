"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import PinBoxes from "@/components/smartly/PinBoxes";
import { hashPin, LOCK_AFTER, markAppOpen, newSalt, pinProblem, saveAppLock, type AppLock, type LockAfter } from "@/lib/customer/appLock";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PopupDialog } from "../Shared/PopupDialog";
import { BoardSegment, CARD, SmallSwitch } from "./boardUi";
import { useAppLock } from "./useAppLock";

// The SettingsSecurity board's App lock card: a 4-digit PIN to open
// Smartly on this device, how long away before it asks again, and the
// amounts hidden when the app opens. Saved in this browser only.
export function AppLockCard() {
  const { t } = useLocale();
  const { user } = useAuth();
  const lock = useAppLock(user.id);
  const [pinOpen, setPinOpen] = useState<"new" | "change" | null>(null);
  const readOnly = Boolean(user.impersonatedBy);
  const save = (next: AppLock, message: string) => {
    saveAppLock(user.id, next);
    toast.success(t(message));
  };

  function toggleLock() {
    if (!lock.on) return setPinOpen("new");
    const before = lock;
    saveAppLock(user.id, { ...lock, on: false, salt: "", hash: "" });
    toast.success(t("App lock is off"), {
      action: {
        label: t("Undo"),
        onClick: () => {
          saveAppLock(user.id, before);
          markAppOpen();
          toast.success(t("App lock is back on"));
        },
      },
    });
  }

  return (
    <section id="ss-lock" aria-labelledby="ss-lock-h" className={cn(CARD, "scroll-mt-4 overflow-hidden")}>
      <div className="flex flex-col gap-0.75 px-5.5 pt-4.5 pb-3.5">
        <h2 id="ss-lock-h" className="text-[16px] leading-[1.35] font-semibold text-ink">
          {t("App lock")}
        </h2>
        <p className="text-small leading-normal text-ink-muted">{t("A 4-digit PIN to open Smartly on this device, even when you are signed in.")}</p>
      </div>
      <div className="flex items-center gap-4.5 border-t border-divider px-5.5 py-3.25">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body font-medium text-ink">{t("Lock the app with a PIN")}</span>
          <span className="text-[12.5px] leading-[1.45] text-ink-muted">
            {lock.on ? t("On · the PIN is asked after {count} min away", { count: String(lock.after) }) : t("Off · anyone holding this device can open the app")}
            {lock.on && !readOnly && (
              <>
                {" · "}
                <button type="button" onClick={() => setPinOpen("change")} className="font-semibold text-emerald hover:underline">
                  {t("Change PIN")}
                </button>
              </>
            )}
          </span>
        </span>
        <SmallSwitch on={lock.on} label={t("Lock the app with a PIN")} disabled={readOnly} onClick={toggleLock} />
      </div>
      <div className={cn("flex flex-wrap items-center gap-4.5 border-t border-divider px-5.5 py-3.25", !lock.on && "opacity-60")}>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body font-medium text-ink">{t("Ask for the PIN after")}</span>
          <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t("How long you can be away before it locks again.")}</span>
        </span>
        <BoardSegment
          value={String(lock.after) as `${LockAfter}`}
          label={t("Ask for the PIN after")}
          disabled={!lock.on || readOnly}
          className="self-center"
          onChange={(after) => save({ ...lock, after: Number(after) as LockAfter }, "Saved")}
          options={LOCK_AFTER.map((minutes) => ({ value: String(minutes) as `${LockAfter}`, label: t("{count} min", { count: String(minutes) }) }))}
        />
      </div>
      <div className="flex items-center gap-4.5 border-t border-divider px-5.5 py-3.25">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body font-medium text-ink">{t("Hide balances when the app opens")}</span>
          <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t("Amounts show as ••••• until you tap them. Handy in public.")}</span>
        </span>
        <SmallSwitch on={lock.hide} label={t("Hide balances when the app opens")} disabled={readOnly} onClick={() => save({ ...lock, hide: !lock.hide }, "Saved")} />
      </div>
      <SetPinDialog
        open={pinOpen !== null}
        changing={pinOpen === "change"}
        current={lock}
        onClose={() => setPinOpen(null)}
        onSave={async (pin) => {
          const salt = newSalt();
          saveAppLock(user.id, { ...lock, on: true, salt, hash: await hashPin(pin, salt) });
          markAppOpen();
          toast.success(t(pinOpen === "change" ? "PIN changed" : "App lock is on"));
          setPinOpen(null);
        }}
      />
    </section>
  );
}

function SetPinDialog({ open, changing, current, onClose, onSave }: { open: boolean; changing: boolean; current: AppLock; onClose: () => void; onSave: (pin: string) => Promise<void> }) {
  const { t } = useLocale();
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [tried, setTried] = useState(false);
  const [same, setSame] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPin("");
      setAgain("");
      setTried(false);
      setSame(false);
    }
  }
  const problem = same ? { field: "pin" as const, reason: "That is your current PIN. Pick a new one." } : pinProblem(pin, again);

  async function submit() {
    setTried(true);
    if (pinProblem(pin, again)) return;
    if (changing && current.on && (await hashPin(pin, current.salt)) === current.hash) return setSame(true);
    await onSave(pin);
  }

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      width={420}
      title={t(changing ? "Change your PIN" : "Set a PIN for this device")}
      sub={t("You type it to open Smartly here. Forgot it? Sign out and sign in again.")}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" className="h-9.5 text-[13.5px]" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button type="submit" size="sm" className="h-9.5 text-[13.5px]">
            {t(changing ? "Change PIN" : "Turn on")}
          </Button>
        </>
      }
    >
      <Field htmlFor="pin-new" label={t("New PIN")} error={tried && problem?.field === "pin" ? t(problem.reason) : undefined}>
        <PinBoxes value={pin} maxLength={4} label={t("New PIN")} autoFocus invalid={tried && problem?.field === "pin"} onChange={(value) => { setPin(value); setSame(false); }} />
      </Field>
      <Field htmlFor="pin-again" label={t("Type it again")} error={tried && problem?.field === "again" ? t(problem.reason) : undefined}>
        <PinBoxes value={again} maxLength={4} label={t("Type it again")} invalid={tried && problem?.field === "again"} onChange={setAgain} onSubmit={() => void submit()} />
      </Field>
    </PopupDialog>
  );
}
