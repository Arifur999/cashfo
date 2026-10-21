"use client";

import { Clock, KeyRound, Lock, LockKeyhole, TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import { unlockVaultAction } from "@/lib/customer/passwordVaultActions";
import { settle } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PasswordField } from "@/components/modules/Customer/Shared/PasswordField";
import { GateAside, GateCard } from "./VaultGate";

interface VaultUnlockFormProps {
  onUnlocked: (vaultToken: string, expiresIn: string) => void;
  onForgot: () => void;
  onChange: () => void;
  // The API says there is no vault password yet (the page couldn't tell
  // beforehand): on to setting one up.
  onNoVault: () => void;
}

// The API's own words for the two answers this form treats apart.
const WRONG_PASSWORD = "Incorrect vault password";
const NO_VAULT = "Set up a vault password first";

const FACTS: { icon: typeof KeyRound; text: string }[] = [
  { icon: KeyRound, text: "A second password, separate from the one you log in with. It is asked every time you open this page." },
  { icon: Clock, text: "Stays open for 10 minutes, then locks itself. Leaving the page locks it straight away." },
  { icon: LockKeyhole, text: "Passwords are encrypted before they are stored, and shown only when you tap show or copy." },
  { icon: TriangleAlert, text: "Forgot the vault password? A reset is possible with your account password, but the saved logins go with it." },
];

// Text buttons under the form: 44px tall, the text still lined up.
const TEXT_BUTTON = "flex min-h-11 items-center rounded-md px-2 text-small font-semibold";

// The unlock form, with a wrong try called out under the box.
export function VaultUnlockForm({ onUnlocked, onForgot, onChange, onNoVault }: VaultUnlockFormProps) {
  const { t } = useLocale();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!password || isPending) return;
    startTransition(async () => {
      const result = await settle(unlockVaultAction(password));
      if (result.success && result.data) {
        setPassword("");
        onUnlocked(result.data.vaultToken, result.data.expiresIn);
      } else if (result.message === NO_VAULT) {
        onNoVault();
      } else {
        setError(!result.message || result.message === WRONG_PASSWORD ? t("That's not your vault password.") : t(result.message));
      }
    });
  }

  return (
    <>
      <GateCard aria-labelledby="vault-unlock-title" className="max-w-110 p-6 sm:p-8">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-info-soft text-info">
              <Lock className="size-6" aria-hidden="true" />
            </span>
            <h2 id="vault-unlock-title" className="text-h2 text-ink">
              {t("Unlock your vault")}
            </h2>
            <p className="text-body leading-normal text-ink-muted">{t("Enter your vault password, not the password you log in with.")}</p>
          </div>
          <Field htmlFor="vault-unlock" label={<span className="text-body font-medium text-ink">{t("Vault password")}</span>} error={error ?? undefined}>
            <PasswordField
              id="vault-unlock"
              value={password}
              onChange={(value) => {
                setPassword(value);
                setError(null);
              }}
              invalid={error !== null}
              autoComplete="off"
              autoFocus
              // 16px on phones, so focusing it doesn't zoom the page.
              className="max-md:text-body-lg"
            />
          </Field>
          <Button type="submit" size="xl" variant="action" disabled={!password || isPending} className="w-full">
            {isPending ? <Loader size={16} onDark label={t("Loading...")} /> : <Lock />}
            {t("Unlock")}
          </Button>
          <div className="-mx-2 flex items-center justify-between gap-3 text-small">
            <button type="button" onClick={onForgot} className={`${TEXT_BUTTON} text-emerald hover:underline`}>
              {t("Forgot vault password?")}
            </button>
            <span className="px-2 text-ink-muted">{t("Opens for 10 minutes")}</span>
          </div>
          <button type="button" onClick={onChange} className={`${TEXT_BUTTON} self-center text-ink-2 hover:text-ink`}>
            {t("Change vault password")}
          </button>
        </form>
      </GateCard>

      <GateAside aria-labelledby="vault-how">
        <h3 id="vault-how" className="text-title text-ink">
          {t("How your vault stays safe")}
        </h3>
        {FACTS.map((fact) => (
          <div key={fact.text} className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-mint-50 text-emerald">
              <fact.icon className="size-4" aria-hidden="true" />
            </span>
            <span className="text-small leading-normal text-ink-2">{t(fact.text)}</span>
          </div>
        ))}
      </GateAside>
    </>
  );
}
