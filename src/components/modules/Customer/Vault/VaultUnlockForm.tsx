"use client";

import { ChevronDown, CircleAlert, Clock, KeyRound, Lock, LockKeyhole, LockKeyholeOpen, TriangleAlert } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { unlockVaultAction, updateVaultSettingsAction, type VaultUnlock } from "@/lib/customer/passwordVaultActions";
import { countdownText, LOCK_MINUTE_CHOICES, settle } from "@/lib/customer/vaultDisplay";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PasswordField } from "@/components/modules/Customer/Shared/PasswordField";
import { GateAside, GateCard } from "./VaultGate";

interface VaultUnlockFormProps {
  onUnlocked: (unlock: VaultUnlock) => void;
  onForgot: () => void;
  onChange: () => void;
  // The API says there is no vault password yet (the page couldn't tell
  // beforehand): on to setting one up.
  onNoVault: () => void;
  // How long one unlock lasts: the person's choice (null = the server's),
  // and what it really is with the server's cap.
  lockMinutes: number | null;
  effectiveMinutes: number;
  onLockTime: (lockMinutes: number | null, effectiveMinutes: number) => void;
  // When a vault locked out by wrong tries takes tries again, as the
  // page's status said, in epoch milliseconds (0 when it isn't).
  lockedUntil?: number;
}

// The API's own words for the answer this form treats apart.
const NO_VAULT = "Set up a vault password first";
// The wait after the tenth wrong try (backend vault-unlock-limit.ts).
const WAIT_MINUTES = 10;

const FACTS: { icon: typeof KeyRound; text: string }[] = [
  { icon: KeyRound, text: "A second password, separate from the one you log in with. It is asked every time you open this page." },
  { icon: Clock, text: "Stays open for {count} minutes, then locks itself. Leaving the page locks it straight away." },
  { icon: LockKeyhole, text: "Passwords are encrypted before they are stored, and shown only when you tap show or copy." },
  { icon: TriangleAlert, text: "Only 10 unlock tries are allowed in 10 minutes, so guessing does not work." },
];

// The unlock form (design-v4 VaultLock), with a wrong try called out under
// the box and the tries left; after ten, the wait.
export function VaultUnlockForm({ onUnlocked, onForgot, onChange, onNoVault, lockMinutes, effectiveMinutes, onLockTime, lockedUntil: lockedAtLoad = 0 }: VaultUnlockFormProps) {
  const { t, fmt } = useLocale();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // When a locked-out vault takes tries again, in epoch milliseconds.
  const [lockedUntil, setLockedUntil] = useState(lockedAtLoad);
  const [now, setNow] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSave] = useTransition();

  const lockedOut = lockedUntil > now;
  // The wait ticks down on screen, and the form opens again at its end.
  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (at >= lockedUntil) {
        setLockedUntil(0);
        setError(null);
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const n = (value: number) => formatCount(value, fmt);
  const minutes = n(Math.max(1, Math.round(effectiveMinutes)));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!password || isPending || lockedOut) return;
    startTransition(async () => {
      const result = await settle(unlockVaultAction(password));
      if (result.success && result.data) {
        setPassword("");
        onUnlocked(result.data);
      } else if (result.reason === "VAULT_LOCKED_OUT") {
        setNow(Date.now());
        setLockedUntil(Date.now() + (result.retryAfterSec ?? WAIT_MINUTES * 60) * 1000);
        setError(null);
      } else if (result.message === NO_VAULT) {
        onNoVault();
      } else if (result.reason === "VAULT_PASSWORD_WRONG" || result.message === "Incorrect vault password") {
        const left = result.triesLeft;
        setError(
          left === undefined
            ? t("That's not your vault password.")
            : t(left === 1 ? "That's not your vault password. {count} try left, then a {minutes}-minute wait." : "That's not your vault password. {count} tries left, then a {minutes}-minute wait.", { count: n(left), minutes: n(WAIT_MINUTES) }),
        );
      } else {
        setError(t(result.message ?? "Couldn't open the vault. Please try again."));
      }
    });
  }

  // The lock time, from the next unlock on.
  function chooseLockTime(value: string) {
    const next = value === "" ? null : Number(value);
    startSave(async () => {
      const result = await settle(updateVaultSettingsAction(next));
      if (result.success && result.data) {
        onLockTime(result.data.lockMinutes, result.data.effectiveMinutes);
        const effective = Math.round(result.data.effectiveMinutes);
        if (next !== null && effective < next) toast.success(t("The vault opens for at most {count} minutes.", { count: n(effective) }));
        else toast.success(t("The vault now opens for {count} minutes.", { count: n(effective) }));
      } else {
        toast.error(t(result.message ?? "Couldn't save the lock time"));
      }
    });
  }

  const wait = toLocaleDigits(countdownText(lockedUntil - now), fmt);
  const message = lockedOut ? t("Too many wrong tries. You can try again in {time}.", { time: wait }) : error;

  return (
    <>
      <GateCard aria-labelledby="vault-unlock-title" className="max-w-110 gap-4.5 sm:p-7">
        <form onSubmit={submit} className="flex flex-col gap-4.5">
          <div className="flex flex-col items-center gap-2.5 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-emerald-soft text-emerald">
              <Lock className="size-6.5" aria-hidden="true" />
            </span>
            <h2 id="vault-unlock-title" className="text-[20px] leading-normal font-semibold text-ink">
              {t("Unlock your vault")}
            </h2>
            <p className="text-body leading-normal text-ink-muted">{t("Enter your vault password, not the password you log in with.")}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vault-unlock" className="text-body leading-normal font-medium text-ink">
              {t("Vault password")}
            </label>
            <PasswordField
              id="vault-unlock"
              value={password}
              onChange={(value) => {
                setPassword(value);
                setError(null);
              }}
              invalid={message !== null}
              aria-describedby={message ? "vault-unlock-error" : undefined}
              autoComplete="off"
              autoFocus
              size="lg"
              className="text-body-lg"
            />
            {message && (
              <span id="vault-unlock-error" role="alert" suppressHydrationWarning className="flex gap-1.5 text-small leading-[1.45] text-expense">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {message}
              </span>
            )}
          </div>
          <Button type="submit" size="xl" variant="action" disabled={!password || isPending || lockedOut} className="w-full text-[15px] [&_svg:not([class*='size-'])]:size-4.25">
            {isPending ? <Loader size={16} onDark label={t("Loading...")} /> : <LockKeyholeOpen />}
            {t("Unlock")}
          </Button>
          <div className="-my-2 flex flex-wrap items-center justify-between gap-x-3 text-small">
            <button type="button" onClick={onForgot} className="flex min-h-9 items-center rounded-md font-semibold whitespace-nowrap text-emerald hover:underline pointer-coarse:min-h-11">
              {t("Forgot vault password?")}
            </button>
            {/* The lock time: the board's "Opens for 10 minutes", a select that changes it. */}
            <label className={cn("relative flex min-h-9 items-center gap-1 rounded-md whitespace-nowrap text-ink-muted hover:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring pointer-coarse:min-h-11", isSaving && "opacity-60")}>
              {t("Opens for {count} minutes", { count: minutes })}
              <ChevronDown className="size-3.5" aria-hidden="true" />
              <select
                value={lockMinutes === null ? "" : String(lockMinutes)}
                onChange={(event) => chooseLockTime(event.target.value)}
                disabled={isSaving}
                aria-label={t("Lock the vault after")}
                className="absolute inset-0 cursor-pointer appearance-none opacity-0"
              >
                <option value="">{t("Standard@@lock time")}</option>
                {LOCK_MINUTE_CHOICES.map((value) => (
                  <option key={value} value={value}>
                    {t(value === 1 ? "{count} minute" : "{count} minutes", { count: n(value) })}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="button" onClick={onChange} className="-mt-2 flex min-h-9 items-center self-center rounded-md px-2 text-small font-semibold text-ink-soft hover:text-ink pointer-coarse:min-h-11">
            {t("Change vault password")}
          </button>
        </form>
      </GateCard>

      <GateAside aria-labelledby="vault-how">
        <h3 id="vault-how" className="text-[15px] leading-normal font-semibold text-ink">
          {t("How your vault stays safe")}
        </h3>
        {FACTS.map((fact) => (
          <div key={fact.text} className="flex gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-soft text-emerald">
              <fact.icon className="size-3.5" aria-hidden="true" />
            </span>
            <span className="text-small leading-normal text-ink-soft">{t(fact.text, { count: minutes })}</span>
          </div>
        ))}
      </GateAside>
    </>
  );
}
