"use client";

import { useForm } from "@tanstack/react-form";
import { Info, Lock, Mail, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { resetPasswordAction, sendResetCodeAction } from "@/app/(auth)/reset-password/_action";
import AppForm from "@/components/shared/form/AppForm";
import AppPasswordField from "@/components/shared/form/AppPasswordField";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import { FORGOT_PASSWORD_ROUTE } from "@/lib/authUtils";
import type { SignInStepView } from "@/lib/completeSignIn";
import { cleanTotpCode } from "@/lib/customer/securityDisplay";
import { firstZodError } from "@/lib/formValidators";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { ResetCodeChallenge } from "@/services/passwordReset.services";
import { getPasswordMismatchError, resetPasswordFormZodSchema, type IResetPasswordFormValues } from "@/zod/auth.validation";
import AuthAlert from "./AuthAlert";
import { localizeValues } from "./authFormError";
import AuthLink from "./AuthLink";
import FormErrorCallout from "./FormErrorCallout";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { useAuthAction } from "./useAuthAction";

const defaultValues: IResetPasswordFormValues = { newPassword: "", confirmPassword: "" };
const schema = resetPasswordFormZodSchema.shape;

// The emailed code's refusals that need a new code, not another try.
const CODE_ENDED = new Set(["CODE_EXPIRED", "CODE_USED", "TOO_MANY_ATTEMPTS", "TOO_MANY_SENDS", "CHALLENGE_NOT_FOUND"]);

interface ResetPasswordFormProps {
  token: string;
  // The customer asked for a code by email before any reset (Settings >
  // Security): it is sent from here and typed with the new password.
  codeRequired?: boolean;
  // Two-step sign-in is on: the password is saved, and the app's code signs in.
  onStep: (step: SignInStepView) => void;
}

// The page an emailed reset link opens. Saving signs the customer in here
// and out everywhere else.
const ResetPasswordForm = ({ token, codeRequired = false, onStep }: ResetPasswordFormProps) => {
  const { locale, t } = useLocale();
  const { run, error, isPending } = useAuthAction(resetPasswordAction);
  const [challenge, setChallenge] = useState<ResetCodeChallenge | null>(null);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [codeProblem, setCodeProblem] = useState<{ message: string; values?: Record<string, string | number> } | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const sendCode = async () => {
    setSending(true);
    setCodeProblem(null);
    try {
      // A code still running is sent again; one that ended starts afresh.
      const answer = await sendResetCodeAction(token, challenge?.challengeId);
      if (answer.success) {
        setChallenge(answer.challenge);
        setResendIn(answer.challenge.resendAfterSec);
        setCode("");
      } else {
        if (answer.reason && CODE_ENDED.has(answer.reason)) setChallenge(null);
        setCodeProblem({ message: answer.message, values: answer.values });
      }
    } catch {
      setCodeProblem({ message: "Unable to reach the server. Please try again." });
    } finally {
      setSending(false);
    }
  };

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      // Success redirects away; a failure or the two-step step resolves.
      const answer = await run({ token, newPassword: value.newPassword, ...(codeRequired && challenge && { challengeId: challenge.challengeId, code }) });
      if (!answer) return;
      if (answer.success) {
        onStep(answer.step);
        return;
      }
      if (answer.reason && CODE_ENDED.has(answer.reason)) setChallenge(null);
      if (answer.reason?.startsWith("CODE_")) setCode("");
    },
  });

  const codeError = error?.reason?.startsWith("CODE_") || error?.reason === "TOO_MANY_ATTEMPTS";
  const codeReady = !codeRequired || (challenge !== null && code.length === 6);

  return (
    <AppForm onSubmit={form.handleSubmit} className="flex flex-col space-y-0 gap-4">
      <AuthAlert tone="info" role="note" icon={Info}>
        {t("Your vault password does not change.")}
      </AuthAlert>

      <form.Field name="newPassword" validators={{ onChange: schema.newPassword }}>
        {(field) => (
          <AppPasswordField field={field} label={t("New password")} size="auth" prepend={<Lock />} autoComplete="new-password" description={<PasswordStrengthMeter password={field.state.value} />} />
        )}
      </form.Field>

      <form.Field
        name="confirmPassword"
        validators={{
          onChangeListenTo: ["newPassword"],
          onChange: ({ value, fieldApi }) => firstZodError(schema.confirmPassword, value) ?? getPasswordMismatchError(fieldApi.form.getFieldValue("newPassword"), value),
        }}
      >
        {(field) => <AppPasswordField field={field} label={t("Type it again")} size="auth" prepend={<Lock />} autoComplete="new-password" />}
      </form.Field>

      {codeRequired && (
        <div className="flex flex-col gap-3 rounded-[14px] border border-line-card bg-strip p-4">
          <div className="flex items-start gap-2.5">
            <Mail className="mt-0.5 size-4.5 shrink-0 text-emerald" aria-hidden="true" />
            <p className="text-small leading-[1.5] text-ink-2">
              {challenge
                ? challenge.channel === "SMS"
                  ? t("We sent a 6-digit code by SMS to {phone}. It works for 10 minutes.", { phone: challenge.sentTo })
                  : t("We emailed a 6-digit code to {email}. It works for 10 minutes.", { email: challenge.sentTo })
                : t("You asked for a code before any password reset. We'll text it to your verified phone, or email it to you.")}
            </p>
          </div>
          {challenge && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-code" className="text-body font-medium text-ink">
                {challenge.channel === "SMS" ? t("Code from the SMS") : t("Code from the email")}
              </label>
              <Input
                id="reset-code"
                size="auth"
                value={code}
                onChange={(event) => setCode(cleanTotpCode(event.target.value))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                invalid={codeError}
                lang="en"
                className="font-semibold tracking-[0.2em] tabular-nums placeholder:font-normal"
              />
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="self-start aria-disabled:cursor-default aria-disabled:opacity-50 pointer-coarse:h-11"
            onClick={() => {
              if (!sending && resendIn <= 0) void sendCode();
            }}
            aria-disabled={sending || resendIn > 0}
            aria-busy={sending}
          >
            <RefreshCw className={sending ? "animate-spin motion-reduce:animate-none" : undefined} aria-hidden="true" />
            {sending ? t("Sending...") : resendIn > 0 ? t("Send again in {seconds}s", { seconds: formatCount(resendIn, locale) }) : t(challenge ? "Send the code again" : "Email me a code")}
          </Button>
          {codeProblem && <AuthAlert tone="error">{t(codeProblem.message, localizeValues(codeProblem.values, (value) => formatCount(value, locale)))}</AuthAlert>}
        </div>
      )}

      <p className="text-body text-ink-2">{t("You'll be signed out on every other device.")}</p>

      {error && (
        <div className="flex flex-col gap-1">
          <FormErrorCallout error={error}>
            {typeof error.attemptsLeft === "number" && t(error.attemptsLeft === 1 ? "1 try left." : "{count} tries left.", { count: formatCount(error.attemptsLeft, locale) })}
          </FormErrorCallout>
          {/* A page older than the site needs the reload, a wrong code
              another try -- not a new link. */}
          {!error.reload && !codeError && (
            <AuthLink href={FORGOT_PASSWORD_ROUTE} className="inline-flex min-h-11 items-center self-start text-body">
              {t("Request a new link")}
            </AuthLink>
          )}
        </div>
      )}

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <AppSubmitButton isPending={isSubmitting || isPending} pendingLabel={t("Saving...")} size="lg" className="mt-1 text-[15px] max-md:h-12 max-md:text-body-lg" disabled={!codeReady}>
            {t("Save new password")}
          </AppSubmitButton>
        )}
      </form.Subscribe>
    </AppForm>
  );
};

export default ResetPasswordForm;
