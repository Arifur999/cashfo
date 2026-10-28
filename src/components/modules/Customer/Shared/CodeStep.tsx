"use client";

import { CircleAlert, Lock, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import CodeBoxes from "@/components/modules/Auth/CodeBoxes";
import Loader from "@/components/shared/Loader";
import type { CodeProblem } from "@/lib/customer/codeProblem";
import { countdownText } from "@/lib/customer/vaultDisplay";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface CodeStepProps {
  // Masked, as the API sent it ("01712-•••678").
  sentTo: string;
  channel: "EMAIL" | "SMS";
  // When the next send is allowed (ms since the epoch).
  resendAt: number;
  sendsLeft: number;
  code: string;
  onCodeChange: (code: string) => void;
  // All six typed: send it.
  onComplete?: (code: string) => void;
  problem: CodeProblem | null;
  busy: boolean;
  resending: boolean;
  // "Send the code again", or "Get a new code" once this one is gone.
  onResend: () => void;
}

// The six boxes for a code we texted or emailed, where it went, the wait
// before it can be sent again, and what went wrong.
export function CodeStep({ sentTo, channel, resendAt, sendsLeft, code, onCodeChange, onComplete, problem, busy, resending, onResend }: CodeStepProps) {
  const { t, fmt } = useLocale();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const gone = problem?.gone ?? false;
  const waitLeft = resendAt - now;
  const waiting = waitLeft > 0 && !gone;
  const values = problem?.values && Object.fromEntries(Object.entries(problem.values).map(([key, value]) => [key, typeof value === "number" ? formatCount(value, fmt) : value]));

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-body leading-normal text-ink-soft" aria-live="polite">
        {channel === "SMS" ? t("We sent a 6-digit code by SMS to {phone}. It works for 10 minutes.", { phone: sentTo }) : t("We emailed a 6-digit code to {email}. It works for 10 minutes.", { email: sentTo })}
      </p>
      <CodeBoxes value={code} onChange={onCodeChange} onComplete={onComplete} invalid={Boolean(problem) && !gone} disabled={busy || gone} autoFocus />
      {problem && (
        <p role="alert" className="flex items-start gap-2 text-caption text-expense">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {t(problem.message, values)}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span className="text-ink-muted">
          {t("Didn't get it?")} {waiting && <span className="text-ink-faint">{t("Resend in {time}", { time: toLocaleDigits(countdownText(waitLeft), fmt) })}</span>}
        </span>
        <button
          type="button"
          onClick={onResend}
          disabled={waiting || busy || resending || (!gone && sendsLeft === 0)}
          className="flex min-h-9 items-center gap-1.5 font-semibold text-emerald hover:underline disabled:text-ink-faint disabled:no-underline"
        >
          {resending ? <Loader size={14} label={t("Loading...")} /> : gone ? <RefreshCw className="size-3.5" aria-hidden="true" /> : null}
          {gone ? t("Get a new code") : t("Send the code again")}
        </button>
      </div>
      <div className="flex items-start gap-2 rounded-[14px] bg-strip px-3 py-2.5 text-[12.5px] leading-normal text-ink-soft">
        <Lock className="mt-0.5 size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
        <span>{t("Never share this code. Smartly staff will never ask you for it.")}</span>
      </div>
    </div>
  );
}
