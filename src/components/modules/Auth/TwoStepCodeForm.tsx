"use client";

import { KeyRound, Shield } from "lucide-react";
import { useState } from "react";
import { cancelSignInStepAction, submitTwoStepCodeAction } from "@/app/(auth)/login/_twoStepAction";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import T from "@/components/shared/T";
import Input from "@/components/smartly/form/Input";
import { BRAND_NAME } from "@/lib/brand";
import { cleanBackupCode } from "@/lib/customer/securityDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import AuthAlert from "./AuthAlert";
import AuthHeading from "./AuthHeading";
import CodeBoxes from "./CodeBoxes";
import TrustDeviceCheckbox from "./TrustDeviceCheckbox";
import { useAuthAction } from "./useAuthAction";

// The step can't go on; the sign-in form takes over and says why.
const ENDED = new Set(["CHALLENGE_EXPIRED", "TOO_MANY_ATTEMPTS"]);

interface TwoStepCodeFormProps {
  email: string;
  audience: "admin" | "user";
  // Back to the sign-in form, with what to say there (the step ended), or
  // nothing (the person chose to go back).
  onBack: (message?: string) => void;
  // The admin pages' heading.
  admin?: boolean;
}

// The second step of a sign-in (AdminTwoFactor): the 6-digit code from the
// authenticator app -- or one of the backup codes -- and whether to trust
// this computer for 30 days. A right code signs in and opens the side the
// account belongs to.
const TwoStepCodeForm = ({ email, audience, onBack, admin = false }: TwoStepCodeFormProps) => {
  const { locale, t } = useLocale();
  const [useBackup, setUseBackup] = useState(false);
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [triesLeft, setTriesLeft] = useState<number | null>(null);
  const { run, error, clearError, isPending } = useAuthAction(submitTwoStepCodeAction);

  const submit = async (typed = code) => {
    if (isPending) return;
    setTriesLeft(null);
    const answer = await run(useBackup ? { backupCode, trustDevice } : { code: typed, trustDevice });
    if (!answer || answer.success) return;
    if (answer.reason && ENDED.has(answer.reason)) {
      clearError();
      onBack(answer.message);
      return;
    }
    if (typeof answer.attemptsLeft === "number") setTriesLeft(answer.attemptsLeft);
    // A wrong code is typed again from the start.
    if (!useBackup) setCode("");
  };

  const back = async () => {
    await cancelSignInStepAction().catch(() => undefined);
    onBack();
  };

  const switchMode = () => {
    clearError();
    setTriesLeft(null);
    setUseBackup((value) => !value);
  };

  const appName = audience === "admin" ? `${BRAND_NAME} Admin` : BRAND_NAME;
  const ready = useBackup ? backupCode.replace("-", "").length === 8 : code.length === 6;

  return (
    <>
      <div className="flex flex-col gap-5">
        <span aria-hidden="true" className="flex size-13 items-center justify-center rounded-[14px] bg-mint-50 text-emerald">
          {useBackup ? <KeyRound className="size-6" /> : <Shield className="size-6" />}
        </span>
        <AuthHeading
          admin={admin}
          title={useBackup ? "Use a backup code" : "Two-step verification"}
          subtitle={
            useBackup ? (
              <T values={{ email: <span className="break-all">{email}</span> }}>{"Type one of the 10 backup codes you saved when you turned two-step on. Each works once. Signed in as {email}."}</T>
            ) : (
              <T values={{ app: <b className="font-semibold text-ink">{appName}</b>, email: <span className="break-all">{email}</span> }}>{"Open your authenticator app and type the 6-digit code for {app}. Signed in as {email}."}</T>
            )
          }
        />
      </div>

      <form
        className="flex flex-col gap-5.5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {useBackup ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="backup-code" className="text-body font-medium text-ink">
              {t("Backup code")}
            </label>
            <Input
              id="backup-code"
              size="auth"
              value={backupCode}
              onChange={(event) => setBackupCode(cleanBackupCode(event.target.value))}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="xxxx-xxxx"
              invalid={Boolean(error)}
              autoFocus
              lang="en"
              className="font-mono tracking-[0.15em]"
            />
          </div>
        ) : (
          <CodeBoxes value={code} onChange={setCode} onComplete={(full) => void submit(full)} invalid={Boolean(error)} disabled={isPending} autoFocus />
        )}

        <TrustDeviceCheckbox checked={trustDevice} onChange={setTrustDevice} />

        {error && (
          <AuthAlert tone="error">
            <p>{t(error.message, error.values)}</p>
            {triesLeft !== null && <p>{t(triesLeft === 1 ? "1 try left." : "{count} tries left.", { count: formatCount(triesLeft, locale) })}</p>}
          </AuthAlert>
        )}

        <AppSubmitButton isPending={isPending} pendingLabel={t("Checking...")} size="lg" className="text-[15px]" disabled={!ready}>
          {t("Verify and continue")}
        </AppSubmitButton>

        <div className="flex flex-wrap items-center justify-between gap-x-4 text-[13.5px]">
          <button type="button" onClick={switchMode} className="inline-flex min-h-11 items-center rounded-sm font-semibold text-emerald hover:text-emerald-hover hover:underline lg:min-h-0">
            {t(useBackup ? "Use the code from the app instead" : "Use a backup code instead")}
          </button>
          <button type="button" onClick={() => void back()} className="inline-flex min-h-11 items-center rounded-sm text-ink-muted hover:text-ink hover:underline lg:min-h-0">
            {t("Back to sign in")}
          </button>
        </div>
      </form>

      <AuthAlert tone="note" role="note">
        {t(audience === "admin" ? "Lost your phone? Another super admin can turn two-step off for your account from Security › Admin team." : "Lost your phone? Use one of your backup codes, or contact support to turn two-step off.")}
      </AuthAlert>
    </>
  );
};

export default TwoStepCodeForm;
