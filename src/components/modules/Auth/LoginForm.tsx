"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Lock, Mail } from "lucide-react";
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
// `again`: the session ended, so the button asks to sign in again.
const LoginForm = ({ redirectTo, again = false }: { redirectTo?: string; again?: boolean }) => {
  const { translate } = useLocale();
  const [serverError, setServerError] = useState<string | null>(null);
  // Unticked, the sign-in lasts until the browser closes. Phones don't show
  // it (their board leaves it out) and stay signed in.
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (values: ILoginFormValues) => signInAction(values, redirectTo, keepSignedIn),
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
        {(field) => <AppField field={field} label={translate("Email")} type="email" size="signIn" prepend={<Mail />} autoComplete="email" placeholder="you@example.com" />}
      </form.Field>

      <form.Field name="password" validators={{ onChange: loginFormZodSchema.shape.password }}>
        {(field) => (
          <AppPasswordField
            field={field}
            label={translate("Password")}
            size="signIn"
            prepend={<Lock />}
            autoComplete="current-password"
            placeholder={translate("Enter your password")}
            aside={
              <AuthLink href={FORGOT_PASSWORD_ROUTE} className="text-small font-semibold max-md:hidden">
                {translate("Forgot password?")}
              </AuthLink>
            }
          />
        )}
      </form.Field>
      {/* Phones: under the field, on the right, as the phone board has it. */}
      <div className="-mt-2 flex justify-end md:hidden">
        <AuthLink href={FORGOT_PASSWORD_ROUTE} className="py-2 text-body font-medium">
          {translate("Forgot password?")}
        </AuthLink>
      </div>
      <label className="hidden cursor-pointer items-center gap-3 text-body text-ink-2 md:flex">
        <input type="checkbox" checked={keepSignedIn} onChange={(event) => setKeepSignedIn(event.target.checked)} className="size-4.5 shrink-0 accent-emerald" />
        {translate("Keep me signed in on this device")}
      </label>

      <FormErrorCallout message={serverError} />

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <AppSubmitButton isPending={isSubmitting || isPending} pendingLabel={translate("Signing in...")} size="2xl">
            {translate(again ? "Sign in again" : "Sign in")}
            <ArrowRight strokeWidth={2.25} aria-hidden="true" />
          </AppSubmitButton>
        )}
      </form.Subscribe>
    </AppForm>
  );
};

export default LoginForm;
