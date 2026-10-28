"use client";

import { useForm } from "@tanstack/react-form";
import { ArrowLeft, Info, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { requestPasswordResetAction } from "@/app/(auth)/forgot-password/_action";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import { LOGIN_ROUTE } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { forgotPasswordFormZodSchema, type IForgotPasswordFormValues } from "@/zod/auth.validation";
import AuthAlert from "./AuthAlert";
import AuthHeading from "./AuthHeading";
import AuthLink from "./AuthLink";
import FormErrorCallout from "./FormErrorCallout";
import ResetLinkSent from "./ResetLinkSent";
import { useAuthAction } from "./useAuthAction";

const defaultValues: IForgotPasswordFormValues = { email: "" };

// Asks for a reset link, then says where it went. The answer is the same
// whether or not the email has an account.
const ForgotPasswordForm = () => {
  const { translate } = useLocale();
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Set by "Use a different email", so the field takes the focus back.
  const returning = useRef(false);
  // Around the email field, to find its input without relying on its id.
  const emailRef = useRef<HTMLDivElement>(null);

  const { run, error, clearError, isPending } = useAuthAction(requestPasswordResetAction);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const answer = await run(value);
      if (answer?.success) {
        setSentTo(value.email.trim());
      }
    },
  });

  useEffect(() => {
    if (!sentTo && returning.current) {
      returning.current = false;
      emailRef.current?.querySelector("input")?.focus();
    }
  }, [sentTo]);

  if (sentTo) {
    return (
      <ResetLinkSent
        email={sentTo}
        onResend={() => run({ email: sentTo })}
        resendError={error}
        isResending={isPending}
        onUseAnotherEmail={() => {
          returning.current = true;
          clearError();
          form.reset();
          setSentTo(null);
        }}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <AuthLink href={LOGIN_ROUTE} className="inline-flex min-h-11 items-center gap-1.5 self-start text-body font-semibold text-ink hover:text-ink lg:min-h-0">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {translate("Back to sign in")}
        </AuthLink>
        <AuthHeading title="Reset your password" subtitle="Type the email you sign in with. We will send a link that works for 30 minutes." />
      </div>
      <AppForm onSubmit={form.handleSubmit} className="flex flex-col space-y-0 gap-4">
        <div ref={emailRef}>
          <form.Field name="email" validators={{ onChange: forgotPasswordFormZodSchema.shape.email }}>
            {(field) => <AppField field={field} label={translate("Email")} type="email" size="auth" prepend={<Mail />} autoComplete="email" placeholder="you@example.com" />}
          </form.Field>
        </div>

        <FormErrorCallout error={error} />

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <AppSubmitButton isPending={isSubmitting || isPending} pendingLabel={translate("Sending...")} size="lg" className="text-[15px] max-md:h-12 max-md:text-body-lg">
              {translate("Send reset link")}
            </AppSubmitButton>
          )}
        </form.Subscribe>
      </AppForm>
      <AuthAlert tone="note" role="note" icon={Info}>
        {translate("For safety, this screen says the same thing whether or not the email has an account. The link works once; check spam if it hasn't arrived in 2 minutes.")}
      </AuthAlert>
    </>
  );
};

export default ForgotPasswordForm;
