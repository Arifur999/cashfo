"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { resetPasswordAction } from "@/app/(auth)/reset-password/_action";
import AppForm from "@/components/shared/form/AppForm";
import AppPasswordField from "@/components/shared/form/AppPasswordField";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import { FORGOT_PASSWORD_ROUTE } from "@/lib/authUtils";
import { firstZodError } from "@/lib/formValidators";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getPasswordMismatchError, resetPasswordFormZodSchema, type IResetPasswordFormValues } from "@/zod/auth.validation";
import AuthLink from "./AuthLink";
import FormErrorCallout from "./FormErrorCallout";
import PasswordStrengthMeter from "./PasswordStrengthMeter";

const defaultValues: IResetPasswordFormValues = { newPassword: "", confirmPassword: "" };
const schema = resetPasswordFormZodSchema.shape;

// The page an emailed reset link opens. Saving signs the customer in here.
const ResetPasswordForm = ({ token }: { token: string }) => {
  const { translate } = useLocale();
  const [serverError, setServerError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({ mutationFn: resetPasswordAction });

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerError(null);
      // Success redirects away; only a failure ever resolves here.
      const result = await mutateAsync({ token, newPassword: value.newPassword });
      if (!result.success) {
        setServerError(result.message);
      }
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit} className="space-y-4">
      <form.Field name="newPassword" validators={{ onChange: schema.newPassword }}>
        {(field) => (
          <AppPasswordField
            field={field}
            label={translate("New password")}
            autoComplete="new-password"
            description={<PasswordStrengthMeter password={field.state.value} />}
          />
        )}
      </form.Field>

      <form.Field
        name="confirmPassword"
        validators={{
          onChangeListenTo: ["newPassword"],
          onChange: ({ value, fieldApi }) =>
            firstZodError(schema.confirmPassword, value) ?? getPasswordMismatchError(fieldApi.form.getFieldValue("newPassword"), value),
        }}
      >
        {(field) => <AppPasswordField field={field} label={translate("Confirm password")} autoComplete="new-password" />}
      </form.Field>

      {serverError && (
        <div className="space-y-2">
          <FormErrorCallout message={serverError} />
          <AuthLink href={FORGOT_PASSWORD_ROUTE} className="text-sm">
            {translate("Request a new link")}
          </AuthLink>
        </div>
      )}

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <AppSubmitButton isPending={isSubmitting || isPending} pendingLabel={translate("Saving...")} className="h-10">
            {translate("Save new password")}
          </AppSubmitButton>
        )}
      </form.Subscribe>
    </AppForm>
  );
};

export default ResetPasswordForm;
