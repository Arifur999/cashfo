"use client";

import { ArrowLeft, Info, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CodeStep } from "@/components/modules/Customer/Shared/CodeStep";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { LOGIN_ROUTE } from "@/lib/authUtils";
import { codeProblem, type CodeProblem } from "@/lib/customer/codeProblem";
import { confirmPhoneResetAction, resendPhoneResetAction, startPhoneResetAction, type PhoneCodeChallenge } from "@/lib/customer/phoneActions";
import { cleanLocalPhone, fullPhone } from "@/lib/customer/settingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import AuthAlert from "./AuthAlert";
import AuthHeading from "./AuthHeading";
import AuthLink from "./AuthLink";

// "Forgot password" by a phone the customer verified in Settings: the
// number, then the code we text to it, then the usual "choose a new
// password" page. An unknown number gets the same screens and no SMS.
const PhoneResetForm = ({ onUseEmail }: { onUseEmail: () => void }) => {
  const { t } = useLocale();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [challenge, setChallenge] = useState<PhoneCodeChallenge | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [code, setCode] = useState("");
  const [problem, setProblem] = useState<CodeProblem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isResending, startResend] = useTransition();
  const number = fullPhone(phone);

  function took(next: PhoneCodeChallenge) {
    setChallenge(next);
    setResendAt(Date.now() + next.resendAfterSec * 1000);
    setCode("");
    setProblem(null);
  }

  function send() {
    if (isPending || !number) return;
    setProblem(null);
    startTransition(async () => {
      const result = await startPhoneResetAction(number);
      if (result.success && result.data) took(result.data);
      else setProblem(codeProblem(result));
    });
  }

  function confirm(typed = code) {
    if (!challenge || isPending || typed.length !== 6 || problem?.gone) return;
    setProblem(null);
    startTransition(async () => {
      const result = await confirmPhoneResetAction(number, challenge.challengeId, typed);
      if (result.success && result.data) router.push(`/reset-password?token=${encodeURIComponent(result.data.resetToken)}`);
      else {
        setProblem(codeProblem(result));
        setCode("");
      }
    });
  }

  function resend() {
    if (!challenge) return;
    if (problem?.gone) {
      setChallenge(null);
      setProblem(null);
      return;
    }
    startResend(async () => {
      const result = await resendPhoneResetAction(number, challenge.challengeId);
      if (result.success && result.data) {
        took(result.data);
        toast.success(t("We sent a new code to {phone}.", { phone: result.data.sentTo }));
      } else if (result.reason === "RESEND_TOO_SOON" && result.retryAfterSec) setResendAt(Date.now() + result.retryAfterSec * 1000);
      else setProblem(codeProblem(result));
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <AuthLink href={LOGIN_ROUTE} className="inline-flex min-h-11 items-center gap-1.5 self-start text-body font-semibold text-ink hover:text-ink lg:min-h-0">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("Back to sign in")}
        </AuthLink>
        <AuthHeading title="Reset your password" subtitle={challenge ? "Enter the code we texted you." : "Type the phone number you verified in Settings. We will text you a 6-digit code."} />
      </div>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (challenge) confirm();
          else send();
        }}
        className="flex flex-col gap-4"
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
            <Field htmlFor="fp-phone" label={t("Phone")}>
              <Input
                id="fp-phone"
                size="auth"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(cleanLocalPhone(event.target.value));
                  setProblem(null);
                }}
                placeholder="1XXX-XXXXXX"
                leading={
                  <span className="flex items-center gap-1.5 font-medium text-ink-2">
                    <Smartphone aria-hidden="true" />
                    +880
                  </span>
                }
                className="tabular-nums"
                autoComplete="tel-national"
                invalid={Boolean(problem)}
                autoFocus
              />
            </Field>
            {problem && (
              <p role="alert" className="text-small text-expense">
                {t(problem.message, problem.values)}
              </p>
            )}
          </>
        )}
        <Button type="submit" size="lg" disabled={isPending || (challenge ? code.length !== 6 || Boolean(problem?.gone) : !number)} className="text-[15px] max-md:h-12 max-md:text-body-lg">
          {isPending && <Loader onDark />}
          {challenge ? t("Continue") : t("Text me a code")}
        </Button>
      </form>
      <button type="button" onClick={onUseEmail} className="self-start text-body font-semibold text-emerald hover:underline">
        {t("Use my email instead")}
      </button>
      <AuthAlert tone="note" role="note" icon={Info}>
        {t("For safety, this screen says the same thing whether or not the number has an account. Only a number verified in Settings > Profile can reset a password.")}
      </AuthAlert>
    </>
  );
};

export default PhoneResetForm;
