"use client";

import { Copy, Download, TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { PasswordField } from "@/components/modules/Customer/Shared/PasswordField";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { getAppToday } from "@/lib/date";
import { disableTwoStepAction, enableTwoStepAction, regenerateBackupCodesAction, startTwoStepSetupAction } from "@/lib/customer/securityActions";
import { backupCodesFile, cleanBackupCode, cleanTotpCode, groupSecret, TWO_STEP_CODE_LENGTH, twoStepProblem } from "@/lib/customer/securityDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { QrCode } from "./QrCode";
import { SettingsDialog } from "./SettingsDialog";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// The 6-digit code from the app: big, spaced digits, the phone's number pad.
function CodeInput({ id, value, onChange, invalid, autoFocus }: { id: string; value: string; onChange: (value: string) => void; invalid?: boolean; autoFocus?: boolean }) {
  return (
    <Input
      id={id}
      size="md"
      value={value}
      onChange={(event) => onChange(cleanTotpCode(event.target.value))}
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={TWO_STEP_CODE_LENGTH + 2}
      placeholder="123456"
      invalid={invalid}
      autoFocus={autoFocus}
      className="font-mono text-body-lg tracking-[0.3em] tabular-nums placeholder:tracking-[0.3em]"
      lang="en"
    />
  );
}

// The ten backup codes, with Copy and Download, and what they are for.
export function BackupCodesView({ codes }: { codes: string[] }) {
  const { t } = useLocale();
  const { user } = useAuth();

  async function copyAll() {
    if (await copyText(codes.join("\n"))) toast.success(t("Backup codes copied"));
    else toast.error(t("Couldn't copy. Select the text and copy it yourself."));
  }

  function download() {
    const url = URL.createObjectURL(new Blob([backupCodesFile(codes, user.email, getAppToday())], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "smartly-backup-codes.txt";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5 rounded-field border border-warning-line bg-warning-50 px-3.5 py-3 text-small leading-normal text-warning-ink">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{t("Keep these somewhere safe, away from your phone. If you lose it, each code lets you sign in once. They won't be shown again.")}</span>
      </div>
      {/* Latin letters on purpose: the codes are typed exactly as shown. */}
      <ol lang="en" aria-label={t("Backup codes")} className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-line bg-strip px-4 py-3.5 font-mono text-body font-semibold tracking-wider text-ink">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => void copyAll()} className="pointer-coarse:h-11">
          <Copy aria-hidden="true" />
          {t("Copy all")}
        </Button>
        <Button variant="secondary" size="sm" onClick={download} className="pointer-coarse:h-11">
          <Download aria-hidden="true" />
          {t("Download")}
        </Button>
      </div>
    </div>
  );
}

interface SetupProps {
  open: boolean;
  onClose: () => void;
  // Two-step is on now; the backup codes are being shown.
  onEnabled: () => void;
}

type SetupStep = "password" | "scan" | "codes";

// Turning two-step sign-in on: the password, then the QR code (or the key
// typed by hand) and the first code from the app, then the backup codes.
export function TwoStepSetupDialog({ open, onClose, onEnabled }: SetupProps) {
  const { t } = useLocale();
  const { user } = useAuth();
  const hasPassword = user.hasPassword !== false;
  const [step, setStep] = useState<SetupStep>("password");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStep("password");
      setPassword("");
      setSecret(null);
      setCode("");
      setCodes([]);
      setProblem(null);
    }
  }

  function start(event?: React.FormEvent) {
    event?.preventDefault();
    if (isPending || (hasPassword && !password)) return;
    setProblem(null);
    startTransition(async () => {
      const result = await startTwoStepSetupAction(hasPassword ? password : undefined);
      if (result.success && result.data) {
        setSecret(result.data);
        setStep("scan");
      } else {
        setProblem(t(twoStepProblem(result.reason, result.message ?? "Couldn't start the set-up")));
      }
    });
  }

  function enable(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || code.length !== TWO_STEP_CODE_LENGTH) return;
    setProblem(null);
    startTransition(async () => {
      const result = await enableTwoStepAction(code);
      if (result.success && result.data) {
        setCodes(result.data.backupCodes);
        setStep("codes");
        onEnabled();
        toast.success(t("Two-step sign-in is on"));
      } else {
        setProblem(t(twoStepProblem(result.reason, result.message ?? "Couldn't turn on two-step sign-in")));
      }
    });
  }

  async function copySecret() {
    if (!secret) return;
    if (await copyText(secret.secret.replace(/\s+/g, ""))) toast.success(t("Key copied"));
    else toast.error(t("Couldn't copy. Select the text and copy it yourself."));
  }

  const error = problem && (
    <p role="alert" className="text-small text-expense">
      {problem}
    </p>
  );

  if (step === "codes") {
    return (
      <SettingsDialog open={open} onClose={onClose} title={t("Save your backup codes")} description={t("Two-step sign-in is on. These codes get you in if you lose your phone.")} footer={<Button onClick={onClose}>{t("Done")}</Button>}>
        <BackupCodesView codes={codes} />
      </SettingsDialog>
    );
  }

  if (step === "scan" && secret) {
    return (
      <SettingsDialog
        open={open}
        onClose={onClose}
        busy={isPending}
        onSubmit={enable}
        title={t("Set up the authenticator app")}
        description={t("Scan the code with Google Authenticator, Microsoft Authenticator or a similar app.")}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="px-3.5">
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isPending || code.length !== TWO_STEP_CODE_LENGTH} className="px-4.5">
              {isPending && <Loader onDark />}
              {t("Turn on")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <QrCode value={secret.otpauthUrl} label={t("QR code for your authenticator app")} />
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-body font-semibold text-ink">{t("1. Scan this code")}</span>
            <span className="text-small leading-normal text-ink-muted">{t("Open the app, tap Add, and point the camera at the code.")}</span>
            <span className="mt-1 text-small text-ink-muted">{t("Can't scan it? Type this key:")}</span>
            <span className="flex items-center gap-2">
              <code lang="en" className="rounded-sm bg-strip px-2 py-1 font-mono text-small font-semibold break-all text-ink">
                {groupSecret(secret.secret)}
              </code>
              <Button type="button" variant="ghost" size="icon-xs" onClick={() => void copySecret()} aria-label={t("Copy the key")}>
                <Copy aria-hidden="true" />
              </Button>
            </span>
          </div>
        </div>
        <Field htmlFor="ts-code" label={t("2. Enter the 6-digit code the app shows")}>
          <CodeInput id="ts-code" value={code} onChange={setCode} invalid={Boolean(problem)} autoFocus />
        </Field>
        {error}
      </SettingsDialog>
    );
  }

  return (
    <SettingsDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      onSubmit={start}
      title={t("Turn on two-step sign-in")}
      description={hasPassword ? t("First, your account password, so we know it's you.") : t("You sign in with Google, so a sign-in in the last 10 minutes confirms it's you.")}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="px-3.5">
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending || (hasPassword && !password)} className="px-4.5">
            {isPending && <Loader onDark />}
            {t("Continue")}
          </Button>
        </>
      }
    >
      {hasPassword && (
        <Field htmlFor="ts-password" label={t("Your account password")}>
          <PasswordField id="ts-password" size="md" className="text-body-lg" value={password} onChange={setPassword} autoComplete="current-password" autoFocus invalid={Boolean(problem)} />
        </Field>
      )}
      {error}
    </SettingsDialog>
  );
}

interface ProofProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

// The password (if the account has one) and a code: what both "Make new
// codes" and "Turn off" ask for. Turning off also takes a backup code.
function useProof(open: boolean) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPassword("");
      setCode("");
      setUseBackup(false);
      setProblem(null);
    }
  }
  return { password, setPassword, code, setCode, useBackup, setUseBackup, problem, setProblem };
}

// Ten new backup codes; the old ones stop working.
export function RegenerateCodesDialog({ open, onClose, onDone }: ProofProps) {
  const { t } = useLocale();
  const { user } = useAuth();
  const hasPassword = user.hasPassword !== false;
  const proof = useProof(open);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setCodes(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || proof.code.length !== TWO_STEP_CODE_LENGTH || (hasPassword && !proof.password)) return;
    proof.setProblem(null);
    startTransition(async () => {
      const result = await regenerateBackupCodesAction({ password: hasPassword ? proof.password : undefined, code: proof.code });
      if (result.success && result.data) {
        setCodes(result.data.backupCodes);
        onDone();
      } else {
        proof.setProblem(t(twoStepProblem(result.reason, result.message ?? "Couldn't make new backup codes")));
      }
    });
  }

  if (codes) {
    return (
      <SettingsDialog open={open} onClose={onClose} title={t("Your new backup codes")} description={t("The old codes no longer work.")} footer={<Button onClick={onClose}>{t("Done")}</Button>}>
        <BackupCodesView codes={codes} />
      </SettingsDialog>
    );
  }

  return (
    <SettingsDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      onSubmit={submit}
      title={t("Make new backup codes")}
      description={t("The ten codes you have now stop working.")}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="px-3.5">
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending || proof.code.length !== TWO_STEP_CODE_LENGTH || (hasPassword && !proof.password)} className="px-4.5">
            {isPending && <Loader onDark />}
            {t("Make new codes")}
          </Button>
        </>
      }
    >
      {hasPassword && (
        <Field htmlFor="rc-password" label={t("Your account password")}>
          <PasswordField id="rc-password" size="md" className="text-body-lg" value={proof.password} onChange={proof.setPassword} autoComplete="current-password" autoFocus />
        </Field>
      )}
      <Field htmlFor="rc-code" label={t("Code from your authenticator app")}>
        <CodeInput id="rc-code" value={proof.code} onChange={proof.setCode} invalid={Boolean(proof.problem)} autoFocus={!hasPassword} />
      </Field>
      {proof.problem && (
        <p role="alert" className="text-small text-expense">
          {proof.problem}
        </p>
      )}
    </SettingsDialog>
  );
}

// Turning two-step sign-in off: the password and a code from the app, or a
// backup code when the phone is gone.
export function DisableTwoStepDialog({ open, onClose, onDone }: ProofProps) {
  const { t } = useLocale();
  const { user } = useAuth();
  const hasPassword = user.hasPassword !== false;
  const proof = useProof(open);
  const [isPending, startTransition] = useTransition();
  const codeReady = proof.useBackup ? proof.code.replace("-", "").length === 8 : proof.code.length === TWO_STEP_CODE_LENGTH;
  const ready = codeReady && (!hasPassword || proof.password.length > 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || !ready) return;
    proof.setProblem(null);
    startTransition(async () => {
      const result = await disableTwoStepAction({ password: hasPassword ? proof.password : undefined, ...(proof.useBackup ? { backupCode: proof.code } : { code: proof.code }) });
      if (result.success) {
        toast.success(t("Two-step sign-in is off"));
        onDone();
        onClose();
      } else {
        proof.setProblem(t(twoStepProblem(result.reason, result.message ?? "Couldn't turn off two-step sign-in")));
      }
    });
  }

  return (
    <SettingsDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      onSubmit={submit}
      title={t("Turn off two-step sign-in?")}
      description={t("Your password alone will get into your account again.")}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="px-3.5">
            {t("Keep it on")}
          </Button>
          <Button type="submit" variant="danger" disabled={isPending || !ready} className="px-4.5">
            {isPending && <Loader onDark />}
            {t("Turn off")}
          </Button>
        </>
      }
    >
      {hasPassword && (
        <Field htmlFor="dt-password" label={t("Your account password")}>
          <PasswordField id="dt-password" size="md" className="text-body-lg" value={proof.password} onChange={proof.setPassword} autoComplete="current-password" autoFocus />
        </Field>
      )}
      <Field
        htmlFor="dt-code"
        label={t(proof.useBackup ? "A backup code" : "Code from your authenticator app")}
        aside={
          <button
            type="button"
            onClick={() => {
              proof.setUseBackup(!proof.useBackup);
              proof.setCode("");
            }}
            className="text-small font-semibold text-emerald hover:underline pointer-coarse:min-h-11"
          >
            {t(proof.useBackup ? "Use the app instead" : "Use a backup code")}
          </button>
        }
      >
        {proof.useBackup ? (
          <Input id="dt-code" size="md" value={proof.code} onChange={(event) => proof.setCode(cleanBackupCode(event.target.value))} placeholder="abcd-1234" autoComplete="off" lang="en" className="font-mono text-body-lg tracking-wider" invalid={Boolean(proof.problem)} />
        ) : (
          <CodeInput id="dt-code" value={proof.code} onChange={proof.setCode} invalid={Boolean(proof.problem)} autoFocus={!hasPassword} />
        )}
      </Field>
      {proof.problem && (
        <p role="alert" className="text-small text-expense">
          {proof.problem}
        </p>
      )}
    </SettingsDialog>
  );
}
