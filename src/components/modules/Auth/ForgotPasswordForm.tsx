"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { useState } from "react";
import { requestPasswordResetAction } from "@/app/(auth)/forgot-password/_action";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import Banner from "@/components/smartly/Banner";
import { LOGIN_ROUTE } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { forgotPasswordFormZodSchema, type IForgotPasswordFormValues } from "@/zod/auth.validation";
import AuthHeading from "./AuthHeading";
import AuthLink from "./AuthLink";
import FormErrorCallout from "./FormErrorCallout";
import ResetLinkSent from "./ResetLinkSent";

const defaultValues: IForgotPasswordFormValues = { email: "" };

// Asks for a reset link, then says where it went. The answer is the same
// whether or not the email has an account.
const ForgotPasswordForm = () => {
  const { translate } = useLocale();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({ mutationFn: requestPasswordResetAction });

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerError(null);
      const result = await mutateAsync(value);
      if (result.success) {
        setSentTo(value.email.trim());
      } else {
        setServerError(result.message);
      }
    },
  });

  if (sentTo) {
    return (
      <ResetLinkSent
        email={sentTo}
        onUseAnotherEmail={() => {
          form.reset();
          setSentTo(null);
        }}
      />
    );
  }

  return (
    <>
      <AuthHeading title="Forgot your password?" subtitle="It happens. Enter the email you sign in with and we'll send you a link to choose a new one." />
      <AppForm onSubmit={form.handleSubmit} className="space-y-4">
        <form.Field name="email" validators={{ onChange: forgotPasswordFormZodSchema.shape.email }}>
          {(field) => (
            <AppField
              field={field}
              label={translate("Email")}
              type="email"
              size="xl"
              autoComplete="email"
              placeholder="you@example.com"
              description={translate("We'll send a link to this address if it has a Smartly account.")}
            />
          )}
        </form.Field>

        <FormErrorCallout message={serverError} />

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <AppSubmitButton isPending={isSubmitting || isPending} pendingLabel={translate("Sending...")} size="2xl">
              {translate("Send reset link")}
              <ArrowRight aria-hidden="true" />
            </AppSubmitButton>
          )}
        </form.Subscribe>
      </AppForm>
      <Banner tone="cream" inline icon={<Clock />} className="font-normal">
        {translate("The link works for 30 minutes and only once. Check spam if it hasn't arrived in 2 minutes.")}
      </Banner>
      <AuthLink href={LOGIN_ROUTE} className="flex items-center justify-center gap-2 text-body">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {translate("Back to sign in")}
      </AuthLink>
    </>
  );
};

export default ForgotPasswordForm;
