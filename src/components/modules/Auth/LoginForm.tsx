"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { signInAction } from "@/app/(auth)/login/_action";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppPasswordField from "@/components/shared/form/AppPasswordField";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import { FORGOT_PASSWORD_ROUTE } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { loginFormZodSchema, type ILoginFormValues } from "@/zod/auth.validation";
import AuthLink from "./AuthLink";
import FormErrorCallout from "./FormErrorCallout";

const defaultValues: ILoginFormValues = { email: "", password: "" };

// Email and password for everyone -- admins and customers alike; the
// account's role decides where it lands.
const LoginForm = ({ redirectTo }: { redirectTo?: string }) => {
  const { translate } = useLocale();
  const [serverError, setServerError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (values: ILoginFormValues) => signInAction(values, redirectTo),
  });

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerError(null);
      // Success redirects away; only a failure ever resolves here.
      const result = await mutateAsync(value);
      if (!result.success) {
        setServerError(result.message);
      }
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit} className="space-y-4">
      <form.Field name="email" validators={{ onChange: loginFormZodSchema.shape.email }}>
        {(field) => <AppField field={field} label={translate("Email")} type="email" size="xl" autoComplete="email" placeholder="you@example.com" />}
      </form.Field>

      <form.Field name="password" validators={{ onChange: loginFormZodSchema.shape.password }}>
        {(field) => (
          <AppPasswordField
            field={field}
            label={translate("Password")}
            size="xl"
            autoComplete="current-password"
            placeholder={translate("Your password")}
            aside={
              <AuthLink href={FORGOT_PASSWORD_ROUTE} className="text-small font-semibold">
                {translate("Forgot password?")}
              </AuthLink>
            }
          />
        )}
      </form.Field>

      <FormErrorCallout message={serverError} />

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <AppSubmitButton isPending={isSubmitting || isPending} pendingLabel={translate("Signing in...")} size="2xl">
            {translate("Sign in")}
            <ArrowRight strokeWidth={2.25} aria-hidden="true" />
          </AppSubmitButton>
        )}
      </form.Subscribe>
    </AppForm>
  );
};

export default LoginForm;
