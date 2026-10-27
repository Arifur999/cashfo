"use client";

import { Copy, Download, TriangleAlert } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { disableMyTwoStepAction, enableMyTwoStepAction, makeMyBackupCodesAction, startMyTwoStepAction } from "@/app/(dashboardLayout)/admin/account/_action";
import { TwoStepKeyCard } from "@/components/modules/Auth/TwoStepKeyCard";
import FormDialog from "@/components/shared/dialog/FormDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { backupCodesFile, cleanBackupCode, cleanTotpCode, TWO_STEP_CODE_LENGTH, twoStepProblem } from "@/lib/customer/securityDisplay";
import { getAppToday } from "@/lib/date";
import { downloadBlob } from "@/lib/download";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The dialogs behind My account's two-step card: turning it on (password,
// then the app's QR code and its first code, then the ten backup codes),
// making new backup codes, and turning it off.

type Failure = { success: false; message: string; reason?: string };

const failureText = (result: Failure, fallback: string) => twoStepProblem(result.reason, result.message || fallback);

function CodeInput({ id, value, onChange, invalid, backup = false }: { id: string; value: string; onChange: (value: string) => void; invalid?: boolean; backup?: boolean }) {
  return (
    <Input
      id={id}
      size="md"
      value={value}
      onChange={(event) => onChange(backup ? cleanBackupCode(event.target.value) : cleanTotpCode(event.target.value))}
      inputMode={backup ? "text" : "numeric"}
      autoComplete="one-time-code"
      maxLength={backup ? 9 : TWO_STEP_CODE_LENGTH + 2}
      placeholder={backup ? "abcd-1234" : "123456"}
      invalid={invalid}
      className="font-mono text-body-lg tracking-[0.3em] tabular-nums placeholder:tracking-[0.3em]"
      lang="en"
    />
  );
}

function PasswordInput({ id, value, onChange, invalid }: { id: string; value: string; onChange: (value: string) => void; invalid?: boolean }) {
  return <Input id={id} type="password" size="md" value={value} onChange={(event) => onChange(event.target.value)} autoComplete="current-password" invalid={invalid} autoFocus />;
}

// The ten backup codes, shown once, with Copy all and Download.
export function BackupCodes({ codes, email }: { codes: string[]; email: string }) {
  const { translate } = useLocale();

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success(translate("Backup codes copied"));
    } catch {
      toast.error(translate("Couldn't copy. Select the text and copy it yourself."));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5 rounded-field border border-warning-line bg-warning-50 px-3.5 py-3 text-small leading-normal text-warning-ink">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{translate("Keep these somewhere safe, away from your phone. If you lose it, each code lets you sign in once. They won't be shown again.")}</span>
      </div>
      {/* Latin letters on purpose: the codes are typed exactly as shown. */}
      <ol lang="en" aria-label={translate("Backup codes")} className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-line bg-strip px-4 py-3.5 font-mono text-body font-semibold tracking-wider text-ink">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => void copyAll()} className="pointer-coarse:h-11">
          <Copy aria-hidden="true" />
          {translate("Copy all")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => downloadBlob(new Blob([backupCodesFile(codes, email, getAppToday())], { type: "text/plain;charset=utf-8" }), "smartly-admin-backup-codes.txt")}
          className="pointer-coarse:h-11"
        >
          <Download aria-hidden="true" />
          {translate("Download")}
        </Button>
      </div>
    </div>
  );
}

// The strip foot every step ends in: Cancel (or Done) and the step's action.
function Foot({ busy, label, disabled, onCancel, cancelLabel = "Cancel" }: { busy: boolean; label?: string; disabled?: boolean; onCancel: () => void; cancelLabel?: string }) {
  const { translate } = useLocale();
  return (
    <div className="-mx-6 -mb-5 mt-5 flex items-center justify-end gap-2.5 border-t border-line bg-strip px-6 py-3.5">
      <Button type="button" variant={label ? "secondary" : "action"} size="md" onClick={onCancel} disabled={busy}>
        {translate(cancelLabel)}
      </Button>
      {label && (
        <Button type="submit" variant="action" size="md" disabled={busy || disabled}>
          {busy && <Loader size={14} onDark />}
          {translate(label)}
        </Button>
      )}
    </div>
  );
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  // Two-step changed: the card reads it again.
  onChanged: () => void;
}

type SetupStep = "password" | "scan" | "codes";

// Turning two-step on.
export function TwoStepSetupDialog({ open, onOpenChange, email, onChanged }: DialogProps) {
  const { translate } = useLocale();
  const passwordId = useId();
  const codeId = useId();
  const [step, setStep] = useState<SetupStep>("password");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function change(next: boolean) {
    if (!next) {
      setStep("password");
      setPassword("");
      setSecret(null);
      setCode("");
      setCodes([]);
      setProblem(null);
    }
    onOpenChange(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setProblem(null);
    startTransition(async () => {
      if (step === "password") {
        const result = await startMyTwoStepAction(password);
        if (result.success) {
          setSecret(result.data);
          setStep("scan");
        } else setProblem(translate(failureText(result, "Couldn't start the set-up")));
      } else if (step === "scan") {
        const result = await enableMyTwoStepAction(code);
        if (result.success) {
          setCodes(result.data.backupCodes);
          setStep("codes");
          onChanged();
          toast.success(translate("Two-step verification is on"));
        } else setProblem(translate(failureText(result, "Couldn't turn on two-step verification")));
      }
    });
  }

  const titles: Record<SetupStep, [string, string]> = {
    password: ["Set up two-step verification", "First, your password, so we know it's you."],
    scan: ["Set up the authenticator app", "Scan the code, then enter the 6-digit code the app shows."],
    codes: ["Save your backup codes", "Two-step verification is on. These codes get you in if you lose your phone."],
  };

  return (
    <FormDialog open={open} onOpenChange={change} title={titles[step][0]} description={titles[step][1]} size="md">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {step === "password" && (
          <Field htmlFor={passwordId} label={translate("Your password")} error={problem}>
            <PasswordInput id={passwordId} value={password} onChange={setPassword} invalid={Boolean(problem)} />
          </Field>
        )}
        {step === "scan" && secret && (
          <>
            <TwoStepKeyCard secret={secret.secret} otpauthUrl={secret.otpauthUrl} />
            <Field htmlFor={codeId} label={translate("Enter the 6-digit code the app shows")} error={problem}>
              <CodeInput id={codeId} value={code} onChange={setCode} invalid={Boolean(problem)} />
            </Field>
          </>
        )}
        {step === "codes" && <BackupCodes codes={codes} email={email} />}
        {step === "codes" ? (
          <Foot busy={false} onCancel={() => change(false)} cancelLabel="Done" />
        ) : (
          <Foot
            busy={busy}
            label={step === "password" ? "Continue" : "Turn on"}
            disabled={step === "password" ? !password : code.length !== TWO_STEP_CODE_LENGTH}
            onCancel={() => change(false)}
          />
        )}
      </form>
    </FormDialog>
  );
}

// Ten new backup codes; the old ones stop working.
export function BackupCodesDialog({ open, onOpenChange, email, onChanged }: DialogProps) {
  const { translate } = useLocale();
  const passwordId = useId();
  const codeId = useId();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function change(next: boolean) {
    if (!next) {
      setPassword("");
      setCode("");
      setCodes(null);
      setProblem(null);
    }
    onOpenChange(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || codes) return;
    setProblem(null);
    startTransition(async () => {
      const result = await makeMyBackupCodesAction(password, code);
      if (result.success) {
        setCodes(result.data.backupCodes);
        onChanged();
      } else setProblem(translate(failureText(result, "Couldn't make new backup codes")));
    });
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={change}
      title={codes ? "Save your backup codes" : "Make new backup codes"}
      description={codes ? "Your old backup codes no longer work." : "Your old backup codes stop working once the new ones are made."}
      size="md"
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {codes ? (
          <BackupCodes codes={codes} email={email} />
        ) : (
          <>
            <Field htmlFor={passwordId} label={translate("Your password")}>
              <PasswordInput id={passwordId} value={password} onChange={setPassword} invalid={Boolean(problem)} />
            </Field>
            <Field htmlFor={codeId} label={translate("The 6-digit code from your app")} error={problem}>
              <CodeInput id={codeId} value={code} onChange={setCode} invalid={Boolean(problem)} />
            </Field>
          </>
        )}
        {codes ? (
          <Foot busy={false} onCancel={() => change(false)} cancelLabel="Done" />
        ) : (
          <Foot busy={busy} label="Make new codes" disabled={!password || code.length !== TWO_STEP_CODE_LENGTH} onCancel={() => change(false)} />
        )}
      </form>
    </FormDialog>
  );
}

// Turning two-step off: the password and a code (or a backup code).
export function TwoStepOffDialog({ open, onOpenChange, onChanged }: Omit<DialogProps, "email">) {
  const { translate } = useLocale();
  const passwordId = useId();
  const codeId = useId();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function change(next: boolean) {
    if (!next) {
      setPassword("");
      setCode("");
      setBackup(false);
      setProblem(null);
    }
    onOpenChange(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setProblem(null);
    startTransition(async () => {
      const result = await disableMyTwoStepAction(password, code, backup);
      if (result.success) {
        toast.success(translate("Two-step verification is off"));
        onChanged();
        change(false);
      } else setProblem(translate(failureText(result, "Couldn't turn off two-step verification")));
    });
  }

  const ready = Boolean(password) && (backup ? code.length === 9 : code.length === TWO_STEP_CODE_LENGTH);

  return (
    <FormDialog open={open} onOpenChange={change} title="Turn off two-step verification" description="Your password alone will sign you in again." size="md">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field htmlFor={passwordId} label={translate("Your password")}>
          <PasswordInput id={passwordId} value={password} onChange={setPassword} invalid={Boolean(problem)} />
        </Field>
        <Field
          htmlFor={codeId}
          label={translate(backup ? "A backup code" : "The 6-digit code from your app")}
          aside={
            <button
              type="button"
              onClick={() => {
                setBackup(!backup);
                setCode("");
              }}
              className="text-small font-semibold text-emerald hover:underline"
            >
              {translate(backup ? "Use the app instead" : "Use a backup code")}
            </button>
          }
          error={problem}
        >
          <CodeInput id={codeId} value={code} onChange={setCode} invalid={Boolean(problem)} backup={backup} />
        </Field>
        <Foot busy={busy} label="Turn off" disabled={!ready} onCancel={() => change(false)} />
      </form>
    </FormDialog>
  );
}
