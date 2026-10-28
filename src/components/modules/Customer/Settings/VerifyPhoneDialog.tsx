"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { CodeStep } from "@/components/modules/Customer/Shared/CodeStep";
import { PasswordField } from "@/components/modules/Customer/Shared/PasswordField";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import { codeProblem, type CodeProblem } from "@/lib/customer/codeProblem";
import { confirmPhoneVerifyAction, resendPhoneVerifyAction, startPhoneVerifyAction, type PhoneCodeChallenge } from "@/lib/customer/phoneActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SettingsDialog } from "./SettingsDialog";

interface VerifyPhoneDialogProps {
  open: boolean;
  // The saved number, as the profile shows it ("+880 1712-345678").
  phone: string;
  onClose: () => void;
  onVerified: () => void;
}

// Settings > Profile > "Verify": the account password (so a stolen session
// can't put someone else's number here), then the code we text to it.
export function VerifyPhoneDialog({ open, phone, onClose, onVerified }: VerifyPhoneDialogProps) {
  const { t } = useLocale();
  const { user } = useAuth();
  const hasPassword = user.hasPassword !== false;
  const [password, setPassword] = useState("");
  const [challenge, setChallenge] = useState<PhoneCodeChallenge | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [code, setCode] = useState("");
  const [problem, setProblem] = useState<CodeProblem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isResending, startResend] = useTransition();

  // Every opening starts at the password.
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPassword("");
      setChallenge(null);
      setCode("");
      setProblem(null);
    }
  }

  function took(next: PhoneCodeChallenge) {
    setChallenge(next);
    setResendAt(Date.now() + next.resendAfterSec * 1000);
    setCode("");
    setProblem(null);
  }

  function send() {
    if (isPending || (hasPassword && !password)) return;
    setProblem(null);
    startTransition(async () => {
      const result = await startPhoneVerifyAction(hasPassword ? password : undefined);
      if (result.success && result.data) took(result.data);
      else setProblem(codeProblem(result));
    });
  }

  function confirm(typed = code) {
    if (!challenge || isPending || typed.length !== 6 || problem?.gone) return;
    setProblem(null);
    startTransition(async () => {
      const result = await confirmPhoneVerifyAction(challenge.challengeId, typed);
      if (result.success) {
        toast.success(t("Your phone number is verified"));
        onVerified();
        onClose();
      } else {
        setProblem(codeProblem(result));
        setCode("");
      }
    });
  }

  function resend() {
    if (!challenge) return;
    // A code that can't be used any more: back to the password for a new one.
    if (problem?.gone) {
      setChallenge(null);
      setProblem(null);
      return;
    }
    startResend(async () => {
      const result = await resendPhoneVerifyAction(challenge.challengeId);
      if (result.success && result.data) {
        took(result.data);
        toast.success(t("We sent a new code to {phone}.", { phone: result.data.sentTo }));
      } else if (result.reason === "RESEND_TOO_SOON" && result.retryAfterSec) setResendAt(Date.now() + result.retryAfterSec * 1000);
      else setProblem(codeProblem(result));
    });
  }

  const busy = isPending || isResending;
  return (
    <SettingsDialog
      open={open}
      onClose={onClose}
      busy={busy}
      onSubmit={(event) => {
        event.preventDefault();
        if (challenge) confirm();
        else send();
      }}
      title={t("Verify your phone")}
      description={challenge ? t("Enter the code to finish.") : t("We'll text a 6-digit code to {phone}.", { phone })}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy} className="px-3.5">
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={busy || (challenge ? code.length !== 6 || Boolean(problem?.gone) : hasPassword && !password)} className="px-4.5">
            {isPending && <Loader onDark />}
            {challenge ? t("Verify") : t("Send code")}
          </Button>
        </>
      }
    >
      {challenge ? (
        <CodeStep
          sentTo={challenge.sentTo}
          channel={challenge.channel}
          resendAt={resendAt}
          sendsLeft={challenge.sendsLeft}
          code={code}
          onCodeChange={(next) => {
            setCode(next);
            if (problem && !problem.gone) setProblem(null);
          }}
          onComplete={confirm}
          problem={problem}
          busy={isPending}
          resending={isResending}
          onResend={resend}
        />
      ) : (
        <>
          {hasPassword && (
            <Field htmlFor="vp-password" label={t("Your account password")} hint={t("So only you can add a number to this account.")}>
              <PasswordField id="vp-password" size="md" className="text-body-lg" value={password} onChange={setPassword} autoComplete="current-password" autoFocus />
            </Field>
          )}
          {problem && (
            <p role="alert" className="text-small text-expense">
              {t(problem.message, problem.values)}
            </p>
          )}
        </>
      )}
    </SettingsDialog>
  );
}
