"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { requestPasswordResetAction } from "@/app/(auth)/forgot-password/_action";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { forgotPasswordFormZodSchema, type IForgotPasswordFormValues } from "@/zod/auth.validation";
import AuthHeading from "./AuthHeading";
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
      <AuthHeading title="Forgot your password?" subtitle="Enter your email and we'll send you a link to reset it." />
      <AppForm onSubmit={form.handleSubmit} className="space-y-4">
        <form.Field name="email" validators={{ onChange: forgotPasswordFormZodSchema.shape.email }}>
          {(field) => <AppField field={field} label={translate("Email")} type="email" autoComplete="email" placeholder="you@example.com" />}
        </form.Field>

        <FormErrorCallout message={serverError} />

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <AppSubmitButton isPending={isSubmitting || isPending} pendingLabel={translate("Sending...")} className="h-10">
              {translate("Send reset link")}
            </AppSubmitButton>
          )}
        </form.Subscribe>
      </AppForm>
    </>
  );
};

export default ForgotPasswordForm;
