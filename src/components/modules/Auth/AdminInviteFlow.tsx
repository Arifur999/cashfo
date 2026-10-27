"use client";

import { useForm } from "@tanstack/react-form";
import { Check, Link2Off, Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { acceptInviteAction, getInviteTwoStepSecretAction } from "@/app/(auth)/admin/invite/_action";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppPasswordField from "@/components/shared/form/AppPasswordField";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import Loader from "@/components/shared/Loader";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import { LOGIN_ROUTE } from "@/lib/authUtils";
import { formatDate } from "@/lib/date";
import { firstZodError } from "@/lib/formValidators";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { InviteCheck } from "@/services/accountAccess.services";
import type { AdminRole } from "@/types/auth.types";
import { getPasswordMismatchError, newPasswordSchema } from "@/zod/auth.validation";
import { z } from "zod";
import AuthAlert from "./AuthAlert";
import AuthBackupCodes from "./AuthBackupCodes";
import AuthHeading from "./AuthHeading";
import FormErrorCallout from "./FormErrorCallout";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { TotpCodeField, TwoStepKeyCard } from "./TwoStepKeyCard";
import { useAuthAction } from "./useAuthAction";

// How the invite names the role, and what it can change (the admin menu's
// rules: lib/authUtils.ts MANAGE_ROLES).
const ROLES: Record<AdminRole, { name: string; can: string }> = {
  SUPER_ADMIN: { name: "Super admin", can: "everything, including settings and the admin team" },
  SUPPORT_ADMIN: { name: "Support admin", can: "users, tickets and feature requests" },
  FINANCE_ADMIN: { name: "Finance admin", can: "plans, coupons, payments and payouts" },
  CONTENT_ADMIN: { name: "Content admin", can: "announcements, legal pages, translations and categories" },
};

const PROBLEMS: Record<string, { title: string; text: string }> = {
  NOT_FOUND: { title: "This invite link doesn't work", text: "Check that the whole link from the email was opened, or ask a super admin to send a new invite." },
  EXPIRED: { title: "This invite has expired", text: "An invite works for 7 days. Ask a super admin to send you a new one." },
  ACCEPTED: { title: "This invite was used already", text: "Each invite works once. If it was you, sign in with the email it was sent to." },
  REVOKED: { title: "This invite was cancelled", text: "A super admin cancelled it. Ask them to send you a new one if you still need access." },
  incomplete: { title: "This invite link is incomplete", text: "Open the link from the email again." },
  unknown: { title: "We couldn't check this invite", text: "The server didn't answer. Reload the page in a moment." },
};

const STEPS = ["Your name", "Password", "Two-step"] as const;

const nameSchema = z.string().trim().min(1, "Enter your name").max(100, "At most 100 characters");

// The three steps, as AdminInviteAccept draws them: done ones ticked in the
// primary, the current one in forest, lines between.
const Stepper = ({ current }: { current: number }) => {
  const { locale, t } = useLocale();
  return (
    <ol aria-label={t("Steps")} className="flex items-center gap-3">
      {STEPS.map((label, index) => {
        const done = index < current;
        const on = index === current;
        return (
          <li key={label} aria-current={on ? "step" : undefined} className={cn("flex items-center gap-2.5", index < STEPS.length - 1 && "flex-1")}>
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-bold",
                done ? "bg-emerald text-white" : on ? "bg-forest text-white" : "border border-input bg-surface text-ink-muted",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : toLocaleDigits(String(index + 1), locale)}
            </span>
            <span className={cn("text-small whitespace-nowrap", done ? "font-medium text-emerald" : on ? "font-semibold text-ink" : "text-ink-muted")}>
              {t(label)}
              {done && <span className="sr-only"> ({t("done")})</span>}
            </span>
            {index < STEPS.length - 1 && <span aria-hidden="true" className="h-px min-w-3 flex-1 bg-line" />}
          </li>
        );
      })}
    </ol>
  );
};

interface AdminInviteFlowProps {
  token: string;
  // The link check as the page opened; null when it couldn't be asked.
  check: InviteCheck | null;
}

// /admin/invite?token=: joining the admin team (AdminInviteAccept). Name,
// password, then two-step with the authenticator app; finishing creates the
// admin, signs them in and shows their backup codes once. The check is
// taken once, as the page opened: after accepting, a re-render finds the
// invite used, and must not replace the backup codes.
const AdminInviteFlow = ({ token, check: checkAtOpen }: AdminInviteFlowProps) => {
  const { locale, t } = useLocale();
  const [check] = useState(checkAtOpen);
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState(check?.valid ? (check.name ?? "") : "");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [secretError, setSecretError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [done, setDone] = useState<{ backupCodes: string[]; destination: string } | null>(null);
  const { run, error, isPending } = useAuthAction(acceptInviteAction);

  // The key is made once per link: fetched when the two-step step opens.
  useEffect(() => {
    if (stepIndex !== 2 || secret || !token) return;
    let live = true;
    getInviteTwoStepSecretAction(token)
      .then((answer) => {
        if (!live) return;
        if (answer.success) setSecret({ secret: answer.secret, otpauthUrl: answer.otpauthUrl });
        else setSecretError(answer.message);
      })
      .catch(() => live && setSecretError("Unable to reach the server. Please try again."));
    return () => {
      live = false;
    };
  }, [stepIndex, secret, token]);

  const nameForm = useForm({
    defaultValues: { name },
    onSubmit: ({ value }) => {
      setName(value.name.trim());
      setStepIndex(1);
    },
  });
  const passwordForm = useForm({
    defaultValues: { password, confirmPassword: password },
    onSubmit: ({ value }) => {
      setPassword(value.password);
      setStepIndex(2);
    },
  });

  if (done && check?.valid) return <AuthBackupCodes admin codes={done.backupCodes} email={check.email} destination={done.destination} />;

  const problemKey = !token ? "incomplete" : check === null ? "unknown" : check.valid ? null : check.reason;
  if (problemKey || !check?.valid) {
    const problem = PROBLEMS[problemKey ?? "unknown"];
    return (
      <>
        <span aria-hidden="true" className="flex size-13 items-center justify-center rounded-[14px] bg-expense-soft text-expense">
          <Link2Off className="size-6" />
        </span>
        <AuthHeading admin title={problem.title} subtitle={problem.text} />
        <Button size="lg" variant="secondary" className="w-full text-[15px]" asChild>
          <Link href={LOGIN_ROUTE}>{t("Go to sign in")}</Link>
        </Button>
      </>
    );
  }

  const role = ROLES[check.role];
  const finish = async () => {
    const answer = await run({ token, name, password, code });
    if (answer?.success) setDone({ backupCodes: answer.backupCodes, destination: answer.destination });
    else if (answer && !answer.success) {
      // A name or password the API refused: back to that step.
      if (/name/i.test(answer.message)) setStepIndex(0);
      else if (/password/i.test(answer.message)) setStepIndex(1);
      setCode("");
    }
  };

  return (
    <>
      <span className="flex w-fit items-center gap-2 rounded-full bg-mint-50 px-3 py-1.5 text-small font-semibold text-brand-ink">
        <Mail className="size-3.5" aria-hidden="true" />
        {t("Invitation from {name}", { name: check.invitedByName })}
      </span>
      <AuthHeading
        admin
        title="Join the admin team"
        subtitle={<T values={{ role: <b className="font-semibold text-ink">{t(role.name)}</b>, can: t(role.can) }}>{"You are joining as {role}: {can}."}</T>}
      />
      <Stepper current={stepIndex} />

      {stepIndex === 0 && (
        <AppForm onSubmit={nameForm.handleSubmit} className="flex flex-col space-y-0 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-email" className="text-body font-medium text-ink">
              {t("Email")}
            </label>
            <Input id="invite-email" size="auth" value={check.email} readOnly leading={<Mail />} frameClassName="bg-strip" className="text-ink-2" />
          </div>
          <nameForm.Field name="name" validators={{ onChange: nameSchema }}>
            {(field) => <AppField field={field} label={t("Your name")} size="auth" prepend={<User />} autoComplete="name" placeholder={t("Your name")} />}
          </nameForm.Field>
          <Button type="submit" size="lg" className="mt-1 w-full text-[15px]">
            {t("Continue")}
          </Button>
        </AppForm>
      )}

      {stepIndex === 1 && (
        <AppForm onSubmit={passwordForm.handleSubmit} className="flex flex-col space-y-0 gap-4">
          <passwordForm.Field name="password" validators={{ onChange: newPasswordSchema }}>
            {(field) => (
              <AppPasswordField field={field} label={t("Password")} size="auth" prepend={<Lock />} autoComplete="new-password" description={<PasswordStrengthMeter password={field.state.value} />} />
            )}
          </passwordForm.Field>
          <passwordForm.Field
            name="confirmPassword"
            validators={{
              onChangeListenTo: ["password"],
              onChange: ({ value, fieldApi }) => firstZodError(z.string().min(1, "Type the password again"), value) ?? getPasswordMismatchError(fieldApi.form.getFieldValue("password"), value),
            }}
          >
            {(field) => <AppPasswordField field={field} label={t("Confirm password")} size="auth" prepend={<Lock />} autoComplete="new-password" />}
          </passwordForm.Field>
          <div className="mt-1 flex gap-3">
            <Button type="button" variant="secondary" size="lg" className="text-[15px]" onClick={() => setStepIndex(0)}>
              {t("Back")}
            </Button>
            <Button type="submit" size="lg" className="flex-1 text-[15px]">
              {t("Continue")}
            </Button>
          </div>
        </AppForm>
      )}

      {stepIndex === 2 && (
        <form
          className="flex flex-col gap-5.5"
          onSubmit={(event) => {
            event.preventDefault();
            void finish();
          }}
        >
          {secret ? (
            <TwoStepKeyCard secret={secret.secret} otpauthUrl={secret.otpauthUrl} />
          ) : secretError ? (
            <AuthAlert tone="problem">{t(secretError)}</AuthAlert>
          ) : (
            <div className="flex justify-center py-6">
              <Loader size={24} label={t("Loading...")} />
            </div>
          )}
          <TotpCodeField id="invite-code" value={code} onChange={setCode} invalid={Boolean(error)} />
          <FormErrorCallout error={error} />
          <AppSubmitButton isPending={isPending} pendingLabel={t("Finishing...")} size="lg" className="text-[15px]" disabled={code.length !== 6 || !secret}>
            {t("Finish and sign in")}
          </AppSubmitButton>
          <button type="button" onClick={() => setStepIndex(1)} className="-mt-2 inline-flex min-h-11 items-center self-start rounded-sm text-[13.5px] text-ink-muted hover:text-ink hover:underline">
            {t("Back")}
          </button>
        </form>
      )}

      <span className="text-[12.5px] text-ink-muted">{t("This invite link works once and ends on {date}.", { date: formatDate(check.expiresAt, "d MMM yyyy", "—", locale) })}</span>
    </>
  );
};

export default AdminInviteFlow;
