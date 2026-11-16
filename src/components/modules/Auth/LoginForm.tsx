"use client";

import { useForm } from "@tanstack/react-form";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { type SignInFailure, signInAction } from "@/app/(auth)/login/_action";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppPasswordField from "@/components/shared/form/AppPasswordField";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import Button from "@/components/smartly/Button";
import { FORGOT_PASSWORD_ROUTE } from "@/lib/authUtils";
import type { SignInStepView } from "@/lib/completeSignIn";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { loginFormZodSchema, type ILoginFormValues } from "@/zod/auth.validation";
import AuthAlert, { type AuthAlertTone } from "./AuthAlert";
import { INVALID_CREDENTIALS_MESSAGE, localizeValues } from "./authFormError";
import AuthLink from "./AuthLink";
import { AuthCheckbox } from "./TrustDeviceCheckbox";
import { useAuthAction } from "./useAuthAction";

const defaultValues: ILoginFormValues = { email: "", password: "" };

const ALERT_TONE: Record<SignInFailure, AuthAlertTone> = { invalid: "error", suspended: "suspended", throttled: "throttled" };

// "14:52" while sign-in from this network is paused.
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

interface LoginFormProps {
  redirectTo?: string;
  // Two-step sign-in is on for this account: the code comes next.
  onStep: (step: SignInStepView) => void;
  // A message to show over the form before anything is typed (the session
  // ended, a Google sign-in or the code step didn't finish).
  notice?: { tone: AuthAlertTone; message: string } | null;
}

// Email and password for everyone -- admins and customers alike; the
// account's role decides where it lands (Main, LoginMobile). What went wrong
// shows over the fields as AdminLoginStates words it, and the fields keep
// what was typed.
const LoginForm = ({ redirectTo, onStep, notice }: LoginFormProps) => {
  const { locale, t } = useLocale();
  // Unticked, the sign-in lasts until the browser closes. Phones don't show
  // it (their board leaves it out) and stay signed in.
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [failure, setFailure] = useState<SignInFailure | null>(null);
  // Seconds until sign-in from this network opens again.
  const [waitLeft, setWaitLeft] = useState(0);

  const { run, error, isPending } = useAuthAction((values: ILoginFormValues) => signInAction(values, redirectTo, keepSignedIn));

  useEffect(() => {
    if (waitLeft <= 0) return;
    const timer = window.setTimeout(() => setWaitLeft((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [waitLeft]);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setFailure(null);
      // Success redirects away; a failure or the two-step step resolves.
      const answer = await run(value);
      if (!answer) return;
      if (answer.success) {
        onStep(answer.step);
        return;
      }
      setFailure(answer.failure ?? null);
      if (answer.failure === "throttled" && answer.retryAfter) setWaitLeft(answer.retryAfter);
    },
  });

  const shown = error ? { tone: failure ? ALERT_TONE[failure] : ("problem" as const), message: t(error.message, localizeValues(error.values, (value) => formatCount(value, locale))) } : notice ? { tone: notice.tone, message: t(notice.message) } : null;
  const waiting = waitLeft > 0;

  return (
    <AppForm onSubmit={form.handleSubmit} className="flex flex-col space-y-0 gap-4.5 lg:gap-5">
      {shown && (
        <AuthAlert tone={shown.tone} role={error ? "alert" : "status"}>
          <p>{shown.message}</p>
          {/* An account made with Google has no password to type. */}
          {error?.message === INVALID_CREDENTIALS_MESSAGE && <p className="mt-1 text-small opacity-90">{t("Created your account with Google? Use Continue with Google.")}</p>}
        </AuthAlert>
      )}

      <form.Field name="email" validators={{ onChange: loginFormZodSchema.shape.email }}>
        {(field) => <AppField field={field} label={t("Email")} type="email" size="auth" prepend={<Mail />} autoComplete="email" placeholder="you@example.com" />}
      </form.Field>

      <div className="flex flex-col">
        <form.Field name="password" validators={{ onChange: loginFormZodSchema.shape.password }}>
          {(field) => (
            <AppPasswordField
              field={field}
              label={t("Password")}
              size="auth"
              prepend={<Lock />}
              autoComplete="current-password"
              placeholder={t("Enter your password")}
              invalid={failure === "invalid"}
              aside={
                <AuthLink href={FORGOT_PASSWORD_ROUTE} className="hidden text-small font-medium lg:inline">
                  {t("Forgot password?")}
                </AuthLink>
              }
            />
          )}
        </form.Field>
        {/* Phones: under the field on the right, as LoginMobile has it. */}
        <AuthLink href={FORGOT_PASSWORD_ROUTE} className="-mb-2 inline-flex min-h-11 items-center self-end text-body font-medium lg:hidden">
          {t("Forgot password?")}
        </AuthLink>
      </div>

      <AuthCheckbox checked={keepSignedIn} onChange={setKeepSignedIn} label="Keep me signed in on this device" className="hidden md:flex" />

      {waiting ? (
        <Button type="button" size="lg" disabled className="w-full bg-line text-[15px] text-ink-muted shadow-none disabled:opacity-100" aria-live="polite">
          {t("Try again in {time}", { time: toLocaleDigits(clock(waitLeft), locale) })}
        </Button>
      ) : (
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <AppSubmitButton
              isPending={isSubmitting || isPending}
              pendingLabel={t("Signing in...")}
              size="lg"
              className={cn("text-[15px] lg:mt-1 shadow-[0_1px_2px_rgba(18,32,29,0.10),0_6px_16px_color-mix(in_srgb,var(--emerald)_18%,transparent)] max-md:h-12 max-md:text-body-lg")}
            >
              {t("Sign in")}
              <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden="true" />
            </AppSubmitButton>
          )}
        </form.Subscribe>
      )}
    </AppForm>
  );
};

export default LoginForm;
