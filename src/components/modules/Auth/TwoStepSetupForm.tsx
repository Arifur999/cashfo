"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { cancelSignInStepAction, finishTwoStepSetupAction, startTwoStepSetupAction } from "@/app/(auth)/login/_twoStepAction";
import Loader from "@/components/shared/Loader";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import AuthAlert from "./AuthAlert";
import AuthBackupCodes from "./AuthBackupCodes";
import AuthHeading from "./AuthHeading";
import { TotpCodeField, TwoStepKeyCard } from "./TwoStepKeyCard";
import TrustDeviceCheckbox from "./TrustDeviceCheckbox";
import { useAuthAction } from "./useAuthAction";

interface TwoStepSetupFormProps {
  email: string;
  onBack: (message?: string) => void;
}

// An admin signing in while two-step is required for every admin, and
// theirs isn't on yet: the key for the authenticator app, its first code,
// and then the ten backup codes -- the same steps as the invite's last one
// (AdminInviteAccept). Finishing signs them in.
const TwoStepSetupForm = ({ email, onBack }: TwoStepSetupFormProps) => {
  const { t } = useLocale();
  const [secret, setSecret] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [done, setDone] = useState<{ backupCodes: string[]; destination: string } | null>(null);
  const { run, error, isPending } = useAuthAction(finishTwoStepSetupAction);

  useEffect(() => {
    let live = true;
    startTwoStepSetupAction()
      .then((answer) => {
        if (!live) return;
        if (answer.success) setSecret({ secret: answer.secret, otpauthUrl: answer.otpauthUrl });
        else if (answer.reason === "CHALLENGE_EXPIRED" || answer.status === 401) onBack(answer.message);
        else setLoadError(answer.message);
      })
      .catch(() => live && setLoadError("Unable to reach the server. Please try again."));
    return () => {
      live = false;
    };
  }, [onBack]);

  if (done) return <AuthBackupCodes codes={done.backupCodes} email={email} destination={done.destination} />;

  const submit = async () => {
    const answer = await run({ code, trustDevice });
    if (answer?.success) setDone({ backupCodes: answer.backupCodes, destination: answer.destination });
    else if (answer && (answer.reason === "CHALLENGE_EXPIRED" || answer.status === 401)) onBack(answer.message);
    else setCode("");
  };

  return (
    <>
      <div className="flex flex-col gap-5">
        <span aria-hidden="true" className="flex size-13 items-center justify-center rounded-[14px] bg-mint-50 text-emerald">
          <ShieldCheck className="size-6" />
        </span>
        <AuthHeading title="Turn on two-step sign-in" subtitle={t("Every admin needs two-step sign-in now. Set it up once to finish signing in as {email}.", { email })} />
      </div>

      {secret ? (
        <form
          className="flex flex-col gap-5.5"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <TwoStepKeyCard secret={secret.secret} otpauthUrl={secret.otpauthUrl} />
          <TotpCodeField id="setup-code" value={code} onChange={setCode} invalid={Boolean(error)} />
          <TrustDeviceCheckbox checked={trustDevice} onChange={setTrustDevice} />
          {error && <AuthAlert tone="error">{t(error.message, error.values)}</AuthAlert>}
          <AppSubmitButton isPending={isPending} pendingLabel={t("Checking...")} size="lg" className="text-[15px]" disabled={code.length !== 6}>
            {t("Finish and sign in")}
          </AppSubmitButton>
        </form>
      ) : loadError ? (
        <AuthAlert tone="problem">{t(loadError)}</AuthAlert>
      ) : (
        <div className="flex justify-center py-8">
          <Loader size={24} label={t("Loading...")} />
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          void cancelSignInStepAction().catch(() => undefined);
          onBack();
        }}
        className="inline-flex min-h-11 items-center self-start rounded-sm text-[13.5px] text-ink-muted hover:text-ink hover:underline"
      >
        {t("Back to sign in")}
      </button>
    </>
  );
};

export default TwoStepSetupForm;
