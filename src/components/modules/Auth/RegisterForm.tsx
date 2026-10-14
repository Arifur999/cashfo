"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Check, Lock, Mail, Phone, User } from "lucide-react";
import { useState } from "react";
import { registerAction } from "@/app/(auth)/register/_action";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppPasswordField from "@/components/shared/form/AppPasswordField";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import { firstZodError } from "@/lib/formValidators";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getPasswordMismatchError, registerFormZodSchema, type IRegisterFormValues } from "@/zod/auth.validation";
import FormErrorCallout from "./FormErrorCallout";
import PasswordStrengthMeter from "./PasswordStrengthMeter";

const defaultValues: IRegisterFormValues = { name: "", email: "", phone: "", password: "", confirmPassword: "" };
const schema = registerFormZodSchema.shape;

interface RegisterFormProps {
  // From a ?ref= invite link; the backend ignores a code it doesn't know.
  referralCode?: string;
}

// A customer account. The language it is created in becomes the account's
// preferred language.
const RegisterForm = ({ referralCode }: RegisterFormProps) => {
  const { locale, translate } = useLocale();
  const [serverError, setServerError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({ mutationFn: registerAction });

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerError(null);
      // Success redirects away; only a failure ever resolves here. The
      // server schema drops confirmPassword -- the API never sees it.
      const result = await mutateAsync({ ...value, preferredLanguage: locale === "bn" ? "BN" : "EN", referralCode });
      if (!result.success) {
        setServerError(result.message);
      }
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit} className="space-y-4">
      <form.Field name="name" validators={{ onChange: schema.name }}>
        {(field) => <AppField field={field} label={translate("Full name")} prepend={<User />} autoComplete="name" placeholder={translate("Your name")} />}
      </form.Field>

      <form.Field name="email" validators={{ onChange: schema.email }}>
        {(field) => <AppField field={field} label={translate("Email")} type="email" prepend={<Mail />} autoComplete="email" placeholder="you@example.com" />}
      </form.Field>

      <form.Field name="phone" validators={{ onChange: schema.phone }}>
        {(field) => (
          <AppField
            field={field}
            label={
              <>
                {translate("Phone")} <span className="font-normal text-ink-muted">({translate("optional")})</span>
              </>
            }
            type="tel"
            prepend={<Phone />}
            autoComplete="tel"
            placeholder="01XXX-XXXXXX"
          />
        )}
      </form.Field>

      <form.Field name="password" validators={{ onChange: schema.password }}>
        {(field) => (
          <AppPasswordField
            field={field}
            label={translate("Password")}
            prepend={<Lock />}
            autoComplete="new-password"
            description={<PasswordStrengthMeter password={field.state.value} />}
          />
        )}
      </form.Field>

      <form.Field
        name="confirmPassword"
        validators={{
          onChangeListenTo: ["password"],
          onChange: ({ value, fieldApi }) =>
            firstZodError(schema.confirmPassword, value) ?? getPasswordMismatchError(fieldApi.form.getFieldValue("password"), value),
        }}
      >
        {(field) => (
          <AppPasswordField
            field={field}
            label={translate("Confirm password")}
            prepend={<Lock />}
            autoComplete="new-password"
            description={
              field.state.value && field.state.value === field.form.getFieldValue("password") ? (
                <span className="flex items-center gap-1 text-brand-ink">
                  <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                  {translate("Passwords match")}
                </span>
              ) : undefined
            }
          />
        )}
      </form.Field>

      {/* The pages themselves are linked at the foot of every sign-in page. */}
      <p className="text-caption font-normal text-ink-muted">{translate("By creating an account, you agree to our Terms of Service and Privacy Policy.")}</p>

      <FormErrorCallout message={serverError} />

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <AppSubmitButton isPending={isSubmitting || isPending} pendingLabel={translate("Creating account...")} size="lg" className="mt-2 text-body-lg">
            {translate("Create account")}
            <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden="true" />
          </AppSubmitButton>
        )}
      </form.Subscribe>
    </AppForm>
  );
};

export default RegisterForm;
