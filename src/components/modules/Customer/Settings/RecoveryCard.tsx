"use client";

import { Mail, ShieldCheck, Smartphone, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { PasswordField } from "@/components/modules/Customer/Shared/PasswordField";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import PinBoxes from "@/components/smartly/PinBoxes";
import { confirmRecoveryEmailAction, removeRecoveryEmailAction, startRecoveryEmailAction, type RecoveryChallenge } from "@/lib/customer/securityActions";
import { cleanLocalPhone } from "@/lib/customer/settingsDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PopupDialog } from "../Shared/PopupDialog";
import { CARD } from "./boardUi";
import { VerifyPhoneDialog } from "./VerifyPhoneDialog";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TILE = "flex size-9 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4.5";

// The SettingsSecurity board's Recovery card: a recovery email (proved
// with a code) that reset links go to as well, the recovery phone (the
// profile's number, proved by SMS) and the backup codes, which come with
// two-step sign-in.
export function RecoveryCard({ twoStepOn, codesLeft, onShowCodes }: { twoStepOn: boolean; codesLeft: number; onShowCodes: () => void }) {
  const { t, fmt } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const readOnly = Boolean(user.impersonatedBy);
  const [emailOpen, setEmailOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [removing, startRemoving] = useTransition();
  const recoveryEmail = user.recoveryEmail ?? null;
  const phone = user.phone ? `+880 ${cleanLocalPhone(user.phone)}` : null;
  const phoneVerified = Boolean(user.phone && user.phoneVerifiedAt);

  function removeEmail() {
    startRemoving(async () => {
      const result = await removeRecoveryEmailAction();
      if (!result.success) return void toast.error(t(result.message ?? "Couldn't remove the recovery email."));
      toast.success(t("Recovery email removed"));
      router.refresh();
    });
  }

  const rows = [
    {
      key: "email",
      icon: <Mail />,
      title: "Recovery email",
      set: Boolean(recoveryEmail),
      value: recoveryEmail,
      empty: "Not added. We send reset links here if you lose your main email.",
      action: (
        <>
          {recoveryEmail && !readOnly && (
            <button type="button" onClick={removeEmail} disabled={removing} aria-label={t("Remove recovery email")} className="flex size-8.5 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-60">
              {removing ? <Loader size={14} /> : <X className="size-4" aria-hidden="true" />}
            </button>
          )}
          <Button variant="secondary" size="sm" className="h-8.5 px-3.5 text-small" disabled={readOnly} onClick={() => setEmailOpen(true)}>
            {t(recoveryEmail ? "Change" : "Add")}
          </Button>
        </>
      ),
    },
    {
      key: "phone",
      icon: <Smartphone />,
      title: "Recovery phone",
      set: phoneVerified,
      value: phone && (phoneVerified ? t("{phone} · verified", { phone }) : t("{phone} · not verified yet", { phone })),
      empty: "Not added. We send a code by SMS to help you back in.",
      action: phone && !phoneVerified ? (
        <Button variant="secondary" size="sm" className="h-8.5 px-3.5 text-small" disabled={readOnly} onClick={() => setPhoneOpen(true)}>
          {t("Verify")}
        </Button>
      ) : (
        <Button asChild variant="secondary" size="sm" className="h-8.5 px-3.5 text-small">
          <Link href="/settings/profile#pf-phone">{t(phone ? "Change" : "Add")}</Link>
        </Button>
      ),
    },
    {
      key: "codes",
      icon: <ShieldCheck />,
      title: "Backup codes",
      set: twoStepOn,
      value: twoStepOn ? t("{count} one-time codes left for when you cannot use your phone", { count: formatCount(codesLeft, fmt) }) : null,
      empty: "They come with two-step sign-in, for when you cannot use your phone.",
      action: (
        <Button variant="secondary" size="sm" className="h-8.5 px-3.5 text-small" disabled={!twoStepOn} onClick={onShowCodes}>
          {t("Show codes")}
        </Button>
      ),
    },
  ];

  return (
    <section id="ss-rec" aria-labelledby="ss-rec-h" className={cn(CARD, "scroll-mt-4 overflow-hidden")}>
      <div className="flex flex-col gap-0.5 px-5.5 py-4">
        <h2 id="ss-rec-h" className="text-[16px] font-semibold text-ink">
          {t("Recovery")}
        </h2>
        <p className="text-[13px] text-ink-muted">{t("Ways to get back in if you forget your password or lose your phone.")}</p>
      </div>
      {rows.map((row) => (
        <div key={row.key} className="flex flex-wrap items-center gap-3.5 border-t border-sunken px-5.5 py-3.25">
          <span className={cn(TILE, row.set ? "bg-primary-soft text-income" : row.key === "codes" ? "bg-surface-sunken text-ink-soft" : "bg-warning-soft text-warning")}>{row.icon}</span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-body font-medium text-ink">{t(row.title)}</span>
            <span className={cn("text-[12.5px] break-all", row.value || row.key === "codes" ? "text-ink-muted" : "text-warning")}>{row.value ?? t(row.empty)}</span>
          </span>
          <span className="flex items-center gap-1">{row.action}</span>
        </div>
      ))}
      <RecoveryEmailDialog open={emailOpen} current={recoveryEmail} onClose={() => setEmailOpen(false)} onSaved={() => router.refresh()} />
      <VerifyPhoneDialog open={phoneOpen} phone={phone ?? ""} onClose={() => setPhoneOpen(false)} onVerified={() => router.refresh()} />
    </section>
  );
}

// Add or change the recovery email: the address (and the account's
// password), then the six-digit code sent to it.
function RecoveryEmailDialog({ open, current, onClose, onSaved }: { open: boolean; current: string | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useLocale();
  const { user } = useAuth();
  const hasPassword = user.hasPassword !== false;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [tried, setTried] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<RecoveryChallenge | null>(null);
  const [pending, startPending] = useTransition();

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setEmail(current ?? "");
      setPassword("");
      setCode("");
      setTried(false);
      setProblem(null);
      setChallenge(null);
    }
  }

  const typed = email.trim().toLowerCase();
  const emailError = !typed ? "Type an email address." : !EMAIL.test(typed) ? "That does not look like an email address." : typed === user.email.toLowerCase() ? "Use a different email from your sign-in email." : null;
  const passwordError = hasPassword && !password ? "Type your account password." : null;

  function send() {
    setTried(true);
    if (emailError || passwordError || pending) return;
    startPending(async () => {
      const result = await startRecoveryEmailAction({ email: typed, ...(hasPassword && { password }) });
      if (!result.success || !result.data) return setProblem(result.message ?? "Couldn't send the code. Try again.");
      setProblem(null);
      setChallenge(result.data);
    });
  }

  function confirm(value = code) {
    if (!challenge || value.length !== 6 || pending) return;
    startPending(async () => {
      const result = await confirmRecoveryEmailAction({ challengeId: challenge.challengeId, code: value });
      if (!result.success) {
        setCode("");
        return setProblem(result.message ?? "That code didn't work. Try again.");
      }
      toast.success(t("Recovery email saved"));
      onClose();
      onSaved();
    });
  }

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={pending}
      width={460}
      title={t(current ? "Change your recovery email" : "Add a recovery email")}
      sub={challenge ? t("We sent a 6-digit code to {email}. Type it to save the address.", { email: challenge.sentTo }) : t("Password reset links go here too, if you lose your main email.")}
      onSubmit={(event) => {
        event.preventDefault();
        if (challenge) confirm();
        else send();
      }}
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" className="h-9.5 text-[13.5px]" disabled={pending} onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button type="submit" size="sm" className="h-9.5 text-[13.5px]" disabled={pending || (challenge !== null && code.length !== 6)}>
            {pending && <Loader size={14} />}
            {t(challenge ? "Save" : "Send the code")}
          </Button>
        </>
      }
    >
      {challenge ? (
        <PinBoxes
          value={code}
          label={t("The 6-digit code")}
          autoFocus
          disabled={pending}
          invalid={Boolean(problem)}
          onChange={(value) => {
            setCode(value);
            setProblem(null);
            if (value.length === 6) confirm(value);
          }}
        />
      ) : (
        <>
          <Field htmlFor="rec-email" label={t("Recovery email")} error={tried && emailError ? t(emailError) : undefined}>
            <Input id="rec-email" type="email" size="md" autoFocus autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} invalid={tried && Boolean(emailError)} />
          </Field>
          {hasPassword && (
            <Field htmlFor="rec-password" label={t("Your account password")} error={tried && passwordError ? t(passwordError) : undefined}>
              <PasswordField id="rec-password" size="md" value={password} onChange={setPassword} autoComplete="current-password" invalid={tried && Boolean(passwordError)} />
            </Field>
          )}
        </>
      )}
      {problem && (
        <p role="alert" className="text-[12.5px] text-expense">
          {t(problem)}
        </p>
      )}
    </PopupDialog>
  );
}
