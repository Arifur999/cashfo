"use client";

import { useForm } from "@tanstack/react-form";
import { ArrowLeft, CircleCheck, Info, Link2Off, Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { resetAdminPasswordAction } from "@/app/(auth)/admin/reset-password/_action";
import AppForm from "@/components/shared/form/AppForm";
import AppPasswordField from "@/components/shared/form/AppPasswordField";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import Button from "@/components/smartly/Button";
import { FORGOT_PASSWORD_ROUTE, LOGIN_ROUTE } from "@/lib/authUtils";
import { firstZodError } from "@/lib/formValidators";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getPasswordMismatchError, newPasswordSchema } from "@/zod/auth.validation";
import AuthAlert from "./AuthAlert";
import AuthHeading from "./AuthHeading";
import AuthLink from "./AuthLink";
import FormErrorCallout from "./FormErrorCallout";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { useAuthAction } from "./useAuthAction";

interface AdminResetPasswordFlowProps {
  token: string;
  // The link check as the page opened.
  status: "valid" | "invalid" | "incomplete" | "unknown";
}

// /admin/reset-password?token=: an admin's emailed reset (AdminForgotPassword).
// Saving signs them out everywhere and hands out no session: they sign in
// again, two-step and all. The check is taken once, as the page opened.
const AdminResetPasswordFlow = ({ token, status }: AdminResetPasswordFlowProps) => {
  const { t } = useLocale();
  const [opened] = useState(status);
  const [saved, setSaved] = useState(false);
  const { run, error, isPending } = useAuthAction(resetAdminPasswordAction);

  const form = useForm({
    defaultValues: { password: "", confirmPassword: "" },
    onSubmit: async ({ value }) => {
      const answer = await run({ token, password: value.password });
      if (answer?.success) setSaved(true);
    },
  });

  const backLink = (
    <AuthLink href={LOGIN_ROUTE} className="inline-flex min-h-11 items-center gap-1.5 self-start text-body font-semibold text-ink hover:text-ink lg:min-h-0">
      <ArrowLeft className="size-4" aria-hidden="true" />
      {t("Back to sign in")}
    </AuthLink>
  );

  if (saved) {
    return (
      <>
        <span aria-hidden="true" className="flex size-13 items-center justify-center rounded-[14px] bg-mint-50 text-emerald">
          <CircleCheck className="size-6" />
        </span>
        <AuthHeading admin focusOnMount title="Password changed" subtitle="You were signed out on every device. Sign in with your new password; two-step sign-in still applies." />
        <Button size="lg" className="w-full text-[15px]" asChild>
          <Link href={LOGIN_ROUTE}>{t("Sign in")}</Link>
        </Button>
      </>
    );
  }

  if (opened === "invalid" || opened === "incomplete") {
    return (
      <>
        <span aria-hidden="true" className="flex size-13 items-center justify-center rounded-[14px] bg-expense-soft text-expense">
          <Link2Off className="size-6" />
        </span>
        <AuthHeading
          admin
          title={opened === "incomplete" ? "This reset link is incomplete" : "This reset link no longer works"}
          subtitle={opened === "incomplete" ? "Open the link from the email again, or request a new one." : "A link lasts 30 minutes, works once, and only the newest one works. Request a new link and open it from the latest email."}
        />
        <Button size="lg" className="w-full text-[15px]" asChild>
          <Link href={FORGOT_PASSWORD_ROUTE}>{t("Request a new link")}</Link>
        </Button>
        {backLink}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {backLink}
        <AuthHeading admin title="Choose a new password" subtitle="For your admin account. You'll be signed out everywhere and sign in again with it." />
      </div>
      <AppForm onSubmit={form.handleSubmit} className="flex flex-col space-y-0 gap-4">
        <form.Field name="password" validators={{ onChange: newPasswordSchema }}>
          {(field) => <AppPasswordField field={field} label={t("New password")} size="auth" prepend={<Lock />} autoComplete="new-password" description={<PasswordStrengthMeter password={field.state.value} />} />}
        </form.Field>
        <form.Field
          name="confirmPassword"
          validators={{
            onChangeListenTo: ["password"],
            onChange: ({ value, fieldApi }) => firstZodError(z.string().min(1, "Type the password again"), value) ?? getPasswordMismatchError(fieldApi.form.getFieldValue("password"), value),
          }}
        >
          {(field) => <AppPasswordField field={field} label={t("Type it again")} size="auth" prepend={<Lock />} autoComplete="new-password" />}
        </form.Field>
        <FormErrorCallout error={error} />
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <AppSubmitButton isPending={isSubmitting || isPending} pendingLabel={t("Saving...")} size="lg" className="text-[15px]">
              {t("Save new password")}
            </AppSubmitButton>
          )}
        </form.Subscribe>
      </AppForm>
      <AuthAlert tone="note" role="note" icon={Info}>
        {t("No email? A super admin can set a new password for you from Security › Admin team.")}
      </AuthAlert>
    </>
  );
};

export default AdminResetPasswordFlow;
