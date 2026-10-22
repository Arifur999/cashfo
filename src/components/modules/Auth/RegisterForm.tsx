"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { ArrowRight, Check, Gift, Lock, Mail, Phone, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { registerAction } from "@/app/(auth)/register/_action";
import { LegalPageLink } from "@/components/modules/Legal/LegalLinks";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppPasswordField from "@/components/shared/form/AppPasswordField";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import OrDivider from "@/components/shared/OrDivider";
import T from "@/components/shared/T";
import { FORGOT_PASSWORD_ROUTE, LOGIN_ROUTE } from "@/lib/authUtils";
import { firstZodError } from "@/lib/formValidators";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getPasswordMismatchError, registerFormZodSchema, type IRegisterFormValues } from "@/zod/auth.validation";
import { ACCOUNT_EXISTS_MESSAGE, INVITE_CODE_MAX_LENGTH, normalizeInviteCode } from "./authFormError";
import AuthLink from "./AuthLink";
import FormErrorCallout from "./FormErrorCallout";
import GoogleSignInButton from "./GoogleSignInButton";
import InviteCodeNotice from "./InviteCodeNotice";
import { useMaintenance } from "./MaintenanceNotice";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { useAuthAction } from "./useAuthAction";

type RegisterFormValues = IRegisterFormValues & { inviteCode: string };

const schema = registerFormZodSchema.shape;
const inviteCodeSchema = z.string().trim().max(INVITE_CODE_MAX_LENGTH, `At most ${INVITE_CODE_MAX_LENGTH} characters`);
const INVITE_FIELD = "inviteCode";

// The legal links' names never break across lines.
const TERMS_LINK = "font-semibold whitespace-nowrap text-brand-ink underline-offset-2 hover:underline";

// Links inside the red callout: its own colour, underlined.
const CALLOUT_LINK = "inline-flex min-h-11 items-center text-current underline hover:text-current";

interface RegisterFormProps {
  // From a ?ref= invite link, already trimmed and capped.
  referralCode?: string;
}

// A customer account, by the form or with Google; the invite code (from a
// ?ref= link, or typed from a friend's message) goes with either. The
// language it is created in becomes the account's preferred language.
const RegisterForm = ({ referralCode }: RegisterFormProps) => {
  // Maintenance mode: the API refuses sign-up, so nothing can be typed and
  // Google can't start one either -- what the notice above says. The same
  // read as that notice; the form waits on it in the page's skeleton.
  const closed = useMaintenance()?.enabled === true;
  const { locale, translate } = useLocale();
  const { run, error, isPending } = useAuthAction(registerAction);
  const [inviteOpen, setInviteOpen] = useState(false);
  const focusInvite = useRef(false);
  // Around the invite field, to find its input without relying on its id.
  const inviteRef = useRef<HTMLDivElement>(null);

  const form = useForm({
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "", inviteCode: referralCode ?? "" } satisfies RegisterFormValues,
    onSubmit: async ({ value }) => {
      const { inviteCode, ...account } = value;
      // Success redirects away. The server schema drops confirmPassword --
      // the API never sees it.
      await run({ ...account, preferredLanguage: locale === "bn" ? "BN" : "EN", referralCode: normalizeInviteCode(inviteCode) });
    },
  });
  const inviteCode = useStore(form.store, (state) => normalizeInviteCode(state.values.inviteCode));

  const openInvite = () => {
    focusInvite.current = true;
    setInviteOpen(true);
  };
  // The field opened from a button: the caret goes straight into it.
  useEffect(() => {
    if (inviteOpen && focusInvite.current) {
      focusInvite.current = false;
      inviteRef.current?.querySelector("input")?.focus();
    }
  }, [inviteOpen]);

  return (
    <>
      {inviteCode && !inviteOpen && <InviteCodeNotice code={inviteCode} onChange={closed ? undefined : openInvite} />}
      <AppForm onSubmit={form.handleSubmit}>
        <fieldset disabled={closed} className="m-0 min-w-0 space-y-3.5 border-0 p-0">
          {/* Two short fields to a row from sm, so the form fits without
              scrolling: name beside phone, then the password pair. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="name" validators={{ onChange: schema.name }}>
              {(field) => <AppField field={field} size="auth" label={translate("Name")} prepend={<User />} autoComplete="name" placeholder={translate("Your name")} />}
            </form.Field>

            <form.Field name="phone" validators={{ onChange: schema.phone }}>
              {(field) => (
                <AppField
                  field={field}
                  size="auth"
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
          </div>

          <form.Field name="email" validators={{ onChange: schema.email }}>
            {(field) => <AppField field={field} size="auth" label={translate("Email")} type="email" prepend={<Mail />} autoComplete="email" placeholder="you@example.com" />}
          </form.Field>

          <div className="grid items-start gap-4 sm:grid-cols-2">
            <form.Field name="password" validators={{ onChange: schema.password }}>
              {(field) => (
                <AppPasswordField
                  field={field}
                  size="auth"
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
                  size="auth"
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
          </div>

          {/* The code the Referrals page hands out, for whoever got it as
              text rather than as a link. */}
          {inviteOpen ? (
            <div ref={inviteRef}>
              <form.Field name={INVITE_FIELD} validators={{ onChange: inviteCodeSchema }}>
                {(field) => (
                  <AppField
                    field={field}
                    size="auth"
                    label={
                      <>
                        {translate("Invite code")} <span className="font-normal text-ink-muted">({translate("optional")})</span>
                      </>
                    }
                    prepend={<Gift />}
                    autoComplete="off"
                    placeholder="A1B2C3D4"
                  />
                )}
              </form.Field>
            </div>
          ) : (
            !inviteCode && (
              // 44px to tap; pulled up a little so it reads with the fields,
              // and as far from the terms below as from the field above.
              <button type="button" onClick={openInvite} className="-my-2 inline-flex min-h-11 items-center self-start rounded-sm text-small font-semibold text-emerald hover:text-emerald-hover hover:underline">
                {translate("Have an invite code?")}
              </button>
            )
          )}

          <p className="text-caption font-normal text-pretty text-ink-muted">
            <T
              values={{
                terms: <LegalPageLink page="terms" newTab className={TERMS_LINK} />,
                privacy: <LegalPageLink page="privacy" newTab className={TERMS_LINK} />,
              }}
            >
              {"By creating an account, you agree to our {terms} and {privacy}."}
            </T>
          </p>

          <FormErrorCallout error={error}>
            {/* A known email: the way into that account instead. */}
            {error?.message === ACCOUNT_EXISTS_MESSAGE && (
              <span className="flex flex-wrap gap-x-4">
                <AuthLink href={LOGIN_ROUTE} className={CALLOUT_LINK}>
                  {translate("Sign in instead")}
                </AuthLink>
                <AuthLink href={FORGOT_PASSWORD_ROUTE} className={CALLOUT_LINK}>
                  {translate("Reset your password")}
                </AuthLink>
              </span>
            )}
          </FormErrorCallout>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <AppSubmitButton isPending={isSubmitting || isPending} pendingLabel={translate("Creating account...")} size="lg" className="mt-1 text-body-lg max-md:h-13">
                {translate("Create account")}
                <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden="true" />
              </AppSubmitButton>
            )}
          </form.Subscribe>
        </fieldset>
      </AppForm>
      <OrDivider />
      {/* As tall as Create account at every width, not the heavier 52px. */}
      <GoogleSignInButton referralCode={inviteCode} label="Sign up with Google" size="lg" className="text-body-lg max-md:h-13" disabled={closed} />
    </>
  );
};

export default RegisterForm;
