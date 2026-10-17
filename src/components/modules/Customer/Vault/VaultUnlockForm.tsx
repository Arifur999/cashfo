"use client";

import { Clock, KeyRound, Lock, LockKeyhole, TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import { unlockVaultAction } from "@/lib/customer/passwordVaultActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PasswordField } from "@/components/modules/Customer/Shared/PasswordField";
import { GateAside, GateCard } from "./VaultGate";

interface VaultUnlockFormProps {
  onUnlocked: (vaultToken: string, expiresIn: string) => void;
  onForgot: () => void;
  onChange: () => void;
}

const FACTS: { icon: typeof KeyRound; text: string }[] = [
  { icon: KeyRound, text: "A second password, separate from the one you log in with. It is asked every time you open this page." },
  { icon: Clock, text: "Stays open for 10 minutes, then locks itself. Leaving the page locks it straight away." },
  { icon: LockKeyhole, text: "Passwords are encrypted before they are stored, and shown only when you tap show or copy." },
  { icon: TriangleAlert, text: "Forgot the vault password? A reset is possible with your account password, but the saved logins go with it." },
];

// The unlock form, with a wrong try called out under the box.
export function VaultUnlockForm({ onUnlocked, onForgot, onChange }: VaultUnlockFormProps) {
  const { t } = useLocale();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!password || isPending) return;
    startTransition(async () => {
      const result = await unlockVaultAction(password);
      if (result.success && result.data) {
        setPassword("");
        onUnlocked(result.data.vaultToken, result.data.expiresIn);
      } else {
        setError(result.message ?? t("That's not your vault password."));
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
            <h2 id="vault-unlock-title" className="text-h2 font-semibold text-ink">
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
            />
          </Field>
          <Button type="submit" size="xl" variant="action" disabled={!password || isPending} className="w-full">
            {isPending ? <Loader /> : <Lock />}
            {t("Unlock")}
          </Button>
          <div className="flex items-center justify-between gap-3 text-small">
            <button type="button" onClick={onForgot} className="font-semibold text-emerald hover:underline">
              {t("Forgot vault password?")}
            </button>
            <span className="text-ink-muted">{t("Opens for 10 minutes")}</span>
          </div>
          <button type="button" onClick={onChange} className="self-center text-small font-semibold text-ink-2 hover:text-ink">
            {t("Change vault password")}
          </button>
        </form>
      </GateCard>

      <GateAside aria-labelledby="vault-how">
        <h3 id="vault-how" className="text-title font-semibold text-ink">
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
