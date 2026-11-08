"use client";

import { CircleAlert, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { confirmWithdrawalAction, resendWithdrawalCodeAction, type ReferralResult } from "@/lib/customer/referralActions";
import type { PayoutRequest, WithdrawalChallenge } from "@/lib/customer/referralTypes";
import { countdownText } from "@/lib/customer/vaultDisplay";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface WithdrawOtpDialogProps {
  challenge: WithdrawalChallenge | null;
  // When it arrived (Date.now() in the handler that got it), for the
  // resend wait.
  issuedAt: number;
  // "৳ 1,000" and "bKash", for the sentence over the boxes.
  amount: string;
  destination: string;
  onBack: () => void;
  onConfirmed: (request: PayoutRequest) => void;
  // The code can't be used any more: start again for a new one.
  onRestart: () => Promise<void>;
  // The request itself was refused on confirming (the balance changed):
  // back to the form, which says why.
  onRefused: (result: ReferralResult<unknown>) => void;
}

const LENGTH = 6;
// A code that can't be used any more: only a new one helps.
const CODE_GONE = new Set(["CODE_EXPIRED", "TOO_MANY_ATTEMPTS", "CODE_USED", "CHALLENGE_NOT_FOUND", "TOO_MANY_SENDS"]);
// Refusals about the code; anything else is about the request.
const CODE_REASONS = new Set([...CODE_GONE, "CODE_WRONG", "RESEND_TOO_SOON", "CODE_NOT_SENT", "EMAIL_NOT_SENT", "EMAIL_NOT_CONFIGURED", "THROTTLED"]);

// Confirm it's you (WithdrawOtpDialog): the 6-digit code we emailed, in six
// boxes over one real input (paste and the phone's one-time-code fill work),
// the resend wait counting down, and what went wrong said under the boxes:
// a wrong code with the tries left, an expired or used-up one with a way to
// get a new one.
export function WithdrawOtpDialog({ challenge, issuedAt, amount, destination, onBack, onConfirmed, onRestart, onRefused }: WithdrawOtpDialogProps) {
  const { t, fmt } = useLocale();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [sentTo, setSentTo] = useState("");
  // How the code last went; "Send by email instead" changes it.
  const [channel, setChannel] = useState<"EMAIL" | "SMS">("EMAIL");
  const [sendsLeft, setSendsLeft] = useState(1);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(0);
  const [focused, setFocused] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isResending, startResend] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // A fresh dialog for each challenge.
  const [seen, setSeen] = useState<string | null>(null);
  if ((challenge?.challengeId ?? null) !== seen) {
    setSeen(challenge?.challengeId ?? null);
    if (challenge) {
      setCode("");
      setError(null);
      setGone(false);
      setSentTo(challenge.sentTo);
      setChannel(challenge.channel);
      setSendsLeft(challenge.sendsLeft);
      setResendAt(issuedAt + challenge.resendAfterSec * 1000);
      setNow(issuedAt);
    }
  }

  // The resend wait ticks while the dialog is open.
  useEffect(() => {
    if (!challenge) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [challenge]);

  function refused(result: ReferralResult<unknown>) {
    const reason = result.reason ?? "";
    if (reason === "CODE_WRONG") {
      const left = result.attemptsLeft;
      if (left === 0) {
        setGone(true);
        setError(t("Too many wrong codes. Start again to get a new one."));
      } else setError(left === undefined ? t(result.message ?? "That code is not right.") : t(left === 1 ? "That code is not right. {count} try left." : "That code is not right. {count} tries left.", { count: formatCount(left, fmt) }));
      setCode("");
      inputRef.current?.focus();
    } else if (CODE_GONE.has(reason)) {
      setGone(true);
      setError(t(result.message ?? "This code can't be used any more. Get a new one."));
    } else if (reason === "RESEND_TOO_SOON" && result.retryAfterSec) {
      setResendAt(Date.now() + result.retryAfterSec * 1000);
      setNow(Date.now());
    } else if (CODE_REASONS.has(reason) || !reason) {
      setError(t(result.message ?? "Something went wrong. Please try again."));
    } else onRefused(result);
  }

  function confirm() {
    if (!challenge || isPending || gone) return;
    if (code.length !== LENGTH) {
      setError(t("Enter the 6-digit code."));
      inputRef.current?.focus();
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await confirmWithdrawalAction(challenge.challengeId, code);
        if (result.success && result.data) onConfirmed(result.data);
        else refused(result);
      } catch {
        setError(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  function resend(byEmail = false) {
    if (!challenge || isResending) return;
    startResend(async () => {
      try {
        if (gone) {
          await onRestart();
          return;
        }
        const result = await resendWithdrawalCodeAction(challenge.challengeId, byEmail);
        if (result.success && result.data) {
          setSentTo(result.data.sentTo);
          setChannel(result.data.channel);
          setSendsLeft(result.data.sendsLeft);
          setResendAt(Date.now() + result.data.resendAfterSec * 1000);
          setNow(Date.now());
          setError(null);
          setCode("");
          toast.success(t("We sent a new code to {email}.", { email: result.data.sentTo }));
        } else refused(result);
      } catch {
        setError(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  const waitLeft = resendAt - now;
  const waiting = waitLeft > 0 && !gone;
  const busy = isPending || isResending;

  return (
    <AlertDialog open={challenge !== null} onOpenChange={(next) => !next && !busy && onBack()}>
      <AlertDialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
        className="w-115 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 shadow-overlay ring-0"
      >
        <div className="flex flex-col items-center gap-3 px-5 pt-7 pb-2 text-center sm:px-7">
          <span aria-hidden="true" className="flex size-13 items-center justify-center rounded-full bg-emerald-soft text-emerald">
            <ShieldCheck className="size-6" strokeWidth={2} />
          </span>
          <AlertDialogTitle className="text-[20px] leading-normal font-semibold text-ink">{t("Confirm it's you")}</AlertDialogTitle>
          <AlertDialogDescription className="text-body leading-[1.55] text-ink-soft">
            {fillNodes(channel === "SMS" ? t("We sent a 6-digit code by SMS to {email}. Enter it to send {amount} to {destination}.") : t("We sent a 6-digit code by email to {email}. Enter it to send {amount} to {destination}."), {
              email: <b className="font-semibold break-words text-ink">{sentTo}</b>,
              amount: <b className="font-semibold whitespace-nowrap text-ink">{amount}</b>,
              destination,
            })}
          </AlertDialogDescription>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            confirm();
          }}
          className="flex flex-col"
        >
          <div className="flex flex-col gap-3.5 px-5 pt-4 pb-5.5 sm:px-7">
            <div role="group" aria-label={t("6-digit code")} className="relative grid grid-cols-6 gap-2" onClick={() => inputRef.current?.focus()}>
              {Array.from({ length: LENGTH }, (_, index) => {
                const active = focused && (index === code.length || (index === LENGTH - 1 && code.length === LENGTH));
                return (
                  <span
                    key={index}
                    aria-hidden="true"
                    className={cn(
                      "flex h-14 items-center justify-center rounded-field border bg-surface text-[24px] font-bold text-ink tabular-nums transition-[border-color,box-shadow]",
                      error && !gone ? "border-expense" : active ? "border-[1.5px] border-emerald focus-halo" : "border-input",
                      gone && "opacity-50",
                    )}
                  >
                    {code[index] ? toLocaleDigits(code[index], fmt) : ""}
                  </span>
                );
              })}
              <input
                ref={inputRef}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/[^\d০-৯]/g, "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).slice(0, LENGTH));
                  if (!gone) setError(null);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={LENGTH}
                disabled={gone || isPending}
                aria-label={t("6-digit code")}
                aria-invalid={!!error || undefined}
                aria-describedby={error ? "otp-error" : undefined}
                className="absolute inset-0 cursor-default opacity-0"
              />
            </div>

            {error && (
              <p id="otp-error" role="alert" className="flex items-start gap-2 text-caption text-expense">
                <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <span className="text-ink-muted">
                {t("Didn't get it?")} {waiting ? <span className="text-ink-faint">{t("Resend in {time}", { time: toLocaleDigits(countdownText(waitLeft), fmt) })}</span> : channel !== "SMS" && t("Check your spam folder too.")}
              </span>
              <span className="flex flex-wrap items-center gap-x-4">
                <button type="button" onClick={() => resend()} disabled={waiting || busy || (!gone && sendsLeft === 0)} className="flex min-h-9 items-center gap-1.5 font-semibold text-emerald hover:underline disabled:text-ink-faint disabled:no-underline">
                  {isResending ? <Loader size={14} label={t("Loading...")} /> : gone ? <RefreshCw className="size-3.5" aria-hidden="true" /> : null}
                  {gone ? t("Get a new code") : t("Send the code again")}
                </button>
                {channel === "SMS" && !gone && (
                  <button type="button" onClick={() => resend(true)} disabled={waiting || busy || sendsLeft === 0} className="flex min-h-9 items-center font-semibold text-emerald hover:underline disabled:text-ink-faint disabled:no-underline">
                    {t("Send by email instead")}
                  </button>
                )}
              </span>
            </div>

            <div className="flex items-start gap-2 rounded-[14px] bg-strip px-3 py-2.5 text-[12.5px] leading-normal text-ink-soft">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
              <span>{t("Never share this code. Smartly staff will never ask you for it.")}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-line bg-strip px-5 py-3.5 sm:px-7">
            <Button type="button" variant="secondary" size="lg" onClick={onBack} disabled={busy} className="h-10.5 px-4">
              {t("Back")}
            </Button>
            <Button type="submit" size="lg" disabled={busy || gone} className="h-10.5 px-4.5">
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {t("Confirm withdrawal")}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
