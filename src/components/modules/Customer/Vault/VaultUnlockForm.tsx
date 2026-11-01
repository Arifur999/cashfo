"use client";

import { Check, ChevronDown, ChevronLeft, CircleAlert, Clock, KeyRound, Lock, LockKeyhole, LockKeyholeOpen, Mail, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import {
  resendVaultUnlockCodeAction,
  unlockVaultAction,
  updateVaultSettingsAction,
  verifyVaultUnlockAction,
  type VaultResetChallenge,
  type VaultUnlock,
} from "@/lib/customer/passwordVaultActions";
import { countdownText, LOCK_MINUTE_CHOICES, settle, type LockReason } from "@/lib/customer/vaultDisplay";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PasswordField } from "@/components/modules/Customer/Shared/PasswordField";

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
  // Why the vault is locked, said in a small pill under the title.
  reason?: LockReason | null;
  // A code already on its way (a new vault's first unlock): the form
  // starts on step two.
  challenge?: VaultResetChallenge | null;
}

// The API's own words for the answer this form treats apart.
const NO_VAULT = "Set up a vault password first";
// The wait after the tenth wrong try (backend vault-unlock-limit.ts).
const WAIT_MINUTES = 10;
// A code that can't be used any more: back to step one for a new one.
const CODE_GONE = new Set(["CODE_EXPIRED", "TOO_MANY_ATTEMPTS", "CODE_USED", "CHALLENGE_NOT_FOUND", "TOO_MANY_SENDS"]);
const CODE_LENGTH = 6;

const FACTS: { icon: typeof KeyRound; title: string; text: string }[] = [
  { icon: KeyRound, title: "Two steps", text: "Vault password, then a code from your email" },
  { icon: Clock, title: "Locks by itself", text: "After {count} minutes, or when you leave" },
  { icon: LockKeyhole, title: "Encrypted", text: "Shown only when you tap show or copy" },
  { icon: TriangleAlert, title: "Stops guessing", text: "Only 10 tries every 10 minutes" },
];

const REASONS: Record<LockReason, { text: string; tone: "plain" | "good"; icon: typeof Lock }> = {
  manual: { text: "You locked the vault", tone: "plain", icon: Lock },
  timeout: { text: "Locked after {count} minutes", tone: "plain", icon: Clock },
  session: { text: "The vault session ended. Unlock it again.", tone: "plain", icon: Clock },
  changed: { text: "Vault password changed. Use the new one.", tone: "good", icon: Check },
};

// The unlock (design VaultLock and VaultCode): one centred column, the card
// with its two steps -- the vault password, then the six-digit code the API
// emails -- and under it how the vault stays safe.
export function VaultUnlockForm({ onUnlocked, onForgot, onChange, onNoVault, lockMinutes, effectiveMinutes, onLockTime, lockedUntil: lockedAtLoad = 0, reason = null, challenge: firstChallenge = null }: VaultUnlockFormProps) {
  const { t, fmt } = useLocale();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // When a locked-out vault takes tries again, in epoch milliseconds.
  const [lockedUntil, setLockedUntil] = useState(lockedAtLoad);
  const [now, setNow] = useState(() => Date.now());
  // Step two: the emailed code's challenge, what was typed, and what went wrong.
  const [challenge, setChallenge] = useState<VaultResetChallenge | null>(firstChallenge);
  const [resendAt, setResendAt] = useState(() => (firstChallenge ? Date.now() + firstChallenge.resendAfterSec * 1000 : 0));
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  // Five wrong codes (or one that ran out): only Back helps now.
  const [codeDead, setCodeDead] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [isResending, startResend] = useTransition();
  const codeInput = useRef<HTMLInputElement>(null);

  const lockedOut = lockedUntil > now;
  const step: 1 | 2 = challenge ? 2 : 1;

  // The lockout wait and the resend wait tick on screen.
  const ticking = lockedUntil > 0 || challenge !== null;
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (lockedUntil && at >= lockedUntil) {
        setLockedUntil(0);
        setError(null);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [ticking, lockedUntil]);

  // Step two takes focus as it comes in.
  useEffect(() => {
    if (challenge) codeInput.current?.focus();
  }, [challenge]);

  const n = (value: number) => formatCount(value, fmt);
  const minutes = n(Math.max(1, Math.round(effectiveMinutes)));

  function toCode(next: VaultResetChallenge) {
    setChallenge(next);
    setCode("");
    setCodeError(null);
    setCodeDead(false);
    setNow(Date.now());
    setResendAt(Date.now() + next.resendAfterSec * 1000);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || lockedOut) return;
    if (!password) {
      setError(t("Type your vault password first."));
      return;
    }
    startTransition(async () => {
      const result = await settle(unlockVaultAction(password));
      if (result.success && result.data) {
        setPassword("");
        if (result.data.step === "open") onUnlocked(result.data);
        else {
          toCode(result.data);
          toast.success(t("Code sent to {email}", { email: result.data.sentTo }), { description: t("Type it here to finish unlocking.") });
        }
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

  function verify(typed = code) {
    if (!challenge || isPending || codeDead) return;
    if (typed.length < CODE_LENGTH) {
      setCodeError(t("Type all 6 digits from the email."));
      return;
    }
    const asked = challenge;
    startTransition(async () => {
      const result = await settle(verifyVaultUnlockAction(asked.challengeId, typed));
      if (result.success && result.data) {
        onUnlocked(result.data);
      } else if (result.reason === "CODE_WRONG") {
        const left = result.attemptsLeft ?? 0;
        setCode("");
        if (left <= 0) {
          setCodeDead(true);
          setCodeError(t("Too many wrong codes. Go back and start again."));
        } else {
          setCodeError(t(left === 1 ? "That code doesn't match. {count} try left." : "That code doesn't match. {count} tries left.", { count: n(left) }));
        }
        codeInput.current?.focus();
      } else if (result.reason && CODE_GONE.has(result.reason)) {
        setCode("");
        setCodeDead(true);
        setCodeError(result.reason === "TOO_MANY_ATTEMPTS" ? t("Too many wrong codes. Go back and start again.") : t(result.message ?? "This code has expired. Start again to get a new one."));
      } else {
        setCodeError(t(result.message ?? "Couldn't open the vault. Please try again."));
      }
    });
  }

  function resend() {
    if (!challenge || isResending) return;
    const asked = challenge;
    startResend(async () => {
      const result = await settle(resendVaultUnlockCodeAction(asked.challengeId));
      if (result.success && result.data) {
        toCode(result.data);
        codeInput.current?.focus();
        toast.success(t("New code sent to {email}", { email: result.data.sentTo }), { description: t("The old code no longer works.") });
      } else if (result.reason === "RESEND_TOO_SOON" && result.retryAfterSec) {
        setResendAt(Date.now() + result.retryAfterSec * 1000);
      } else if (result.reason && CODE_GONE.has(result.reason)) {
        setCodeDead(true);
        setCodeError(t(result.message ?? "This code has expired. Start again to get a new one."));
      } else {
        toast.error(t(result.message ?? "We could not send the code. Please try again in a minute."));
      }
    });
  }

  function back() {
    setChallenge(null);
    setCode("");
    setCodeError(null);
    setCodeDead(false);
    setError(null);
    requestAnimationFrame(() => document.getElementById("vault-unlock")?.focus());
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
  const message = lockedOut ? t("Too many tries. You can try again in {time}, or reset your vault password.", { time: wait }) : error;
  const pill = reason ? REASONS[reason] : null;
  const resendLeft = resendAt - now;

  return (
    <div className="flex w-full flex-col items-center gap-4.5 pt-2 max-md:pt-0">
      <Card asChild padding="none" className="w-full max-w-110">
        <section aria-labelledby={step === 1 ? "vault-unlock-title" : "vault-code-title"} className="flex flex-col gap-4.5 px-5 pt-7 pb-6 sm:px-8 sm:pt-8 sm:pb-6.5">
          <ol aria-label={t("Unlock steps")} className="-mb-1 flex items-center justify-center gap-2">
            <li aria-current={step === 1 ? "step" : undefined} className={cn("flex items-center gap-1.5 text-caption font-semibold", step === 2 ? "text-emerald" : "text-ink")}>
              <span aria-hidden="true" className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {step === 2 ? <Check className="size-3" strokeWidth={3.5} /> : n(1)}
              </span>
              {t("Vault password")}
            </li>
            <li aria-hidden="true" className={cn("h-0.5 w-7 rounded-full", step === 2 ? "bg-primary" : "bg-line")} />
            <li aria-current={step === 2 ? "step" : undefined} className={cn("flex items-center gap-1.5 text-caption font-semibold", step === 2 ? "text-ink" : "text-ink-muted")}>
              <span aria-hidden="true" className={cn("flex size-5 items-center justify-center rounded-full text-[11px] font-bold", step === 2 ? "bg-primary text-primary-foreground" : "bg-surface-sunken text-ink-soft")}>
                {n(2)}
              </span>
              {t("Email code")}
            </li>
          </ol>

          {step === 1 ? (
            <form onSubmit={submit} noValidate className="flex flex-col gap-4.5">
              <div className="flex flex-col items-center gap-2.5 text-center">
                <span className="flex size-15 items-center justify-center rounded-full bg-emerald-soft text-emerald">
                  <Lock className="size-6.5" aria-hidden="true" />
                </span>
                <h2 id="vault-unlock-title" className="text-[21px] leading-[1.3] font-semibold tracking-[-0.01em] text-ink">
                  {t("Unlock your vault")}
                </h2>
                <p className="text-body leading-normal text-ink-muted">{t("Use your vault password, not your login password.")}</p>
                {pill && (
                  <span role="status" className={cn("mt-0.5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium", pill.tone === "good" ? "border-emerald-line bg-emerald-soft text-brand-ink" : "border-line bg-strip text-ink-soft")}>
                    <pill.icon className="size-3" strokeWidth={2.5} aria-hidden="true" />
                    {t(pill.text, { count: minutes })}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="vault-unlock" className="text-[13.5px] leading-normal font-medium text-ink-2">
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
                  autoFocus={!challenge}
                  size="xl"
                  className="text-[15px]"
                />
                {message && (
                  <span id="vault-unlock-error" role="alert" suppressHydrationWarning className="flex gap-1.5 text-small leading-[1.45] text-expense">
                    <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    {message}
                  </span>
                )}
              </div>
              <Button type="submit" size="xl" variant="action" disabled={isPending || lockedOut} className="w-full text-[15px] [&_svg:not([class*='size-'])]:size-4.25">
                {isPending ? <Loader size={16} onDark label={t("Loading...")} /> : <LockKeyholeOpen />}
                {lockedOut ? t("Wait {time}", { time: wait }) : t("Unlock")}
              </Button>
              <div className="-my-1.5 flex flex-col items-center">
                <button type="button" onClick={onForgot} className="flex min-h-9 items-center rounded-md px-2 text-[13.5px] font-semibold text-emerald hover:underline pointer-coarse:min-h-11">
                  {t("Forgot vault password?")}
                </button>
                <button type="button" onClick={onChange} className="flex min-h-8 items-center rounded-md px-2 text-small font-medium text-ink-muted hover:text-ink pointer-coarse:min-h-11">
                  {t("Change vault password")}
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                verify();
              }}
              noValidate
              className="flex flex-col gap-4.5"
            >
              <div className="flex flex-col items-center gap-2.5 text-center">
                <span className="flex size-15 items-center justify-center rounded-full bg-emerald-soft text-emerald">
                  <Mail className="size-6.5" aria-hidden="true" />
                </span>
                <h2 id="vault-code-title" className="text-[21px] leading-[1.3] font-semibold tracking-[-0.01em] text-ink">
                  {t("Check your email")}
                </h2>
                <p className="text-body leading-normal text-ink-muted">
                  {t("We sent a 6-digit code to")} <b className="font-semibold break-all text-ink">{challenge?.sentTo}</b>
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <span id="vault-code-label" className="text-[13.5px] leading-normal font-medium text-ink-2">
                  {t("Verification code")}
                </span>
                <div className="relative grid grid-cols-6 gap-2">
                  {Array.from({ length: CODE_LENGTH }, (_, index) => {
                    const digit = code.charAt(index);
                    const current = codeFocused && index === Math.min(code.length, CODE_LENGTH - 1) && code.length < CODE_LENGTH;
                    return (
                      <span
                        key={index}
                        aria-hidden="true"
                        className={cn(
                          "flex h-13.5 items-center justify-center rounded-xl font-mono text-[22px] font-semibold text-ink",
                          current ? "border-2 border-emerald bg-surface" : codeError && !code ? "border-[1.5px] border-expense-line bg-surface" : digit ? "border-[1.5px] border-emerald-line bg-strip" : "border border-line-strong bg-surface",
                        )}
                      >
                        {digit ? toLocaleDigits(digit, fmt) : current && <span className="h-6 w-0.5 animate-pulse rounded-full bg-emerald" />}
                      </span>
                    );
                  })}
                  <input
                    ref={codeInput}
                    id="vault-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={CODE_LENGTH}
                    value={code}
                    disabled={codeDead}
                    onChange={(event) => {
                      const next = event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
                      setCode(next);
                      setCodeError(null);
                      // The sixth digit checks the code by itself.
                      if (next.length === CODE_LENGTH) verify(next);
                    }}
                    onFocus={() => setCodeFocused(true)}
                    onBlur={() => setCodeFocused(false)}
                    aria-labelledby="vault-code-label"
                    aria-invalid={codeError ? true : undefined}
                    aria-describedby={codeError ? "vault-code-error" : undefined}
                    className="absolute inset-0 size-full cursor-text border-0 bg-transparent p-0 text-[16px] text-transparent caret-transparent outline-none"
                  />
                </div>
                {codeError && (
                  <span id="vault-code-error" role="alert" className="flex gap-1.5 text-small leading-[1.45] text-expense">
                    <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    {codeError}
                  </span>
                )}
              </div>
              <Button type="submit" size="xl" variant="action" disabled={isPending || codeDead} className="w-full text-[15px] [&_svg:not([class*='size-'])]:size-4.25">
                {isPending ? <Loader size={16} onDark label={t("Loading...")} /> : <ShieldCheck />}
                {t("Verify and unlock")}
              </Button>
              <div className="-my-1 flex items-center justify-between gap-3 text-[13.5px]">
                <button type="button" onClick={back} className="flex min-h-9 items-center gap-1 rounded-md font-medium text-ink-soft hover:text-ink pointer-coarse:min-h-11">
                  <ChevronLeft className="size-3.5" aria-hidden="true" />
                  {t("Back")}
                </button>
                {resendLeft > 0 ? (
                  <span className="text-ink-muted tabular-nums">{t("Resend code in {time}", { time: toLocaleDigits(countdownText(resendLeft), fmt) })}</span>
                ) : (
                  <button type="button" onClick={resend} disabled={isResending || codeDead} className="flex min-h-9 items-center rounded-md font-semibold text-emerald hover:underline disabled:text-ink-muted disabled:no-underline pointer-coarse:min-h-11">
                    {t("Resend code")}
                  </button>
                )}
              </div>
              <p className="-mt-1.5 text-center text-caption leading-normal text-ink-faint">{t("Can't find it? Check spam. The code works for 10 minutes.")}</p>
            </form>
          )}
        </section>
      </Card>

      <section aria-labelledby="vault-how" className="flex w-full max-w-110 flex-col gap-3">
        <h3 id="vault-how" className="text-center text-caption font-semibold tracking-[0.06em] text-ink-muted uppercase">
          {t("How your vault stays safe")}
        </h3>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {FACTS.map((fact) => (
            <div key={fact.title} className="flex gap-2.5 rounded-[14px] border border-divider bg-surface p-3">
              <span className="flex size-7.5 shrink-0 items-center justify-center rounded-[9px] bg-emerald-soft text-emerald">
                <fact.icon className="size-3.5" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[13px] leading-normal font-semibold text-ink">{t(fact.title)}</span>
                <span className="text-caption leading-[1.45] text-ink-muted">{t(fact.text, { count: minutes })}</span>
                {/* The lock time: changed here, from the next unlock on. */}
                {fact.icon === Clock && (
                  <label className={cn("relative mt-0.5 flex w-fit items-center gap-0.5 rounded-sm text-caption font-semibold text-emerald hover:underline has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring pointer-coarse:min-h-11", isSaving && "opacity-60")}>
                    {t("Change the time")}
                    <ChevronDown className="size-3" aria-hidden="true" />
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
                )}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
