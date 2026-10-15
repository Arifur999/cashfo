"use client";

import { ArrowLeft, Check, Circle, Info, KeyRound, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import IconTile from "@/components/smartly/IconTile";
import { Checkbox } from "@/components/ui/checkbox";
import { resetVaultAction, setVaultPasswordAction } from "@/lib/customer/passwordVaultActions";
import { rulesMet, vaultRules } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PasswordField } from "./PasswordField";
import { StrengthMeter } from "./StrengthMeter";
import { GateAside, GateCard } from "./VaultGate";

export type VaultPasswordMode = "setup" | "change" | "reset";

interface VaultPasswordFormProps {
  mode: VaultPasswordMode;
  // After the password is set: back to the unlock form.
  onDone: () => void;
  onBack: () => void;
}

const COPY: Record<VaultPasswordMode, { title: string; sub: string; button: string; success: string; failure: string }> = {
  setup: { title: "Set up your vault password", sub: "One time. You'll use it to open this page.", button: "Set vault password", success: "Vault password set. Unlock below to continue.", failure: "Failed to set vault password" },
  change: { title: "Change your vault password", sub: "Your account password and the current vault password, then the new one.", button: "Change vault password", success: "Vault password changed. Unlock below to continue.", failure: "Failed to set vault password" },
  reset: { title: "Reset your vault password", sub: "Confirm your account password, then pick a new one.", button: "Delete saved logins and reset", success: "Vault reset. Unlock below to continue.", failure: "Failed to reset the vault" },
};

const TIPS = ["Three or four unrelated words, like a short sentence only you would write", "Not your name, phone number, birthday or 123", "Not used anywhere else, including your Smartly login"];

// Set, change or reset the vault password. A reset deletes the saved logins
// (they are locked with the forgotten password), and the form says so.
export function VaultPasswordForm({ mode, onDone, onBack }: VaultPasswordFormProps) {
  const { t } = useLocale();
  const [accountPassword, setAccountPassword] = useState("");
  const [currentVaultPassword, setCurrentVaultPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const rules = vaultRules(password, confirm, accountPassword);
  const valid = accountPassword.length > 0 && rulesMet(rules) && (mode !== "change" || currentVaultPassword.length > 0) && (mode !== "reset" || agreed);
  const copy = COPY[mode];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const result = mode === "reset" ? await resetVaultAction({ currentPassword: accountPassword, vaultPassword: password }) : await setVaultPasswordAction({ currentPassword: accountPassword, vaultPassword: password, ...(mode === "change" && { currentVaultPassword }) });
      if (result.success) {
        toast.success(t(copy.success));
        onDone();
      } else {
        toast.error(result.message ?? t(copy.failure));
      }
    });
  }

  const label = (text: string) => <span className="text-body font-medium text-ink">{text}</span>;

  return (
    <>
      <GateCard aria-labelledby="vault-form-title">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <IconTile size={48} tone={mode === "reset" ? "warning" : "money"} className="rounded-lg">
              {mode === "change" ? <KeyRound /> : <ShieldCheck />}
            </IconTile>
            <div className="flex flex-col gap-0.5">
              <h2 id="vault-form-title" className="text-h3 text-ink">
                {t(copy.title)}
              </h2>
              <span className="text-body text-ink-muted">{t(copy.sub)}</span>
            </div>
          </div>

          {mode === "reset" && (
            <div role="alert" className="flex items-start gap-3 rounded-md border border-warning-soft bg-warning-soft px-4 py-3 text-small leading-normal text-warning">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                <b className="font-semibold">{t("Your saved logins will be deleted.")}</b> {t("They are locked with the forgotten password, so they can't be opened again.")}
              </span>
            </div>
          )}
          {mode === "change" && (
            <div className="flex items-start gap-3 rounded-md border border-mint-200 bg-mint-50 px-4 py-3 text-small leading-normal text-forest">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                <b className="font-semibold">{t("Your saved logins stay as they are.")}</b> {t("Only the password that opens the vault changes.")}
              </span>
            </div>
          )}

          <Field htmlFor="vault-account" label={label(t("Your account password"))} hint={mode === "setup" ? t("The one you log in with. It proves this is really you.") : undefined}>
            <PasswordField id="vault-account" value={accountPassword} onChange={setAccountPassword} autoComplete="current-password" autoFocus />
          </Field>
          {mode === "change" && (
            <Field htmlFor="vault-current" label={label(t("Current vault password"))}>
              <PasswordField id="vault-current" value={currentVaultPassword} onChange={setCurrentVaultPassword} autoComplete="off" />
            </Field>
          )}
          <Field htmlFor="vault-new" label={label(t("New vault password"))}>
            <PasswordField id="vault-new" value={password} onChange={setPassword} autoComplete="new-password" />
          </Field>
          <StrengthMeter password={password} className="-mt-2" />
          <ul className="-mt-1 grid gap-x-3 gap-y-2 sm:grid-cols-2" aria-label={t("Rules")}>
            {rules
              .filter((rule) => rule.key !== "match")
              .map((rule) => (
                <li key={rule.key} className={cn("flex items-center gap-2 text-small", rule.ok ? "text-income" : "text-ink-muted")}>
                  {rule.ok ? <Check className="size-4" strokeWidth={2.5} aria-hidden="true" /> : <Circle className="size-4" aria-hidden="true" />}
                  {t(rule.label)}
                </li>
              ))}
          </ul>
          <Field htmlFor="vault-confirm" label={label(t("Type it again"))} hint={confirm.length > 0 ? <span className={cn("flex items-center gap-2", rules[3].ok ? "text-income" : "text-expense")}>{rules[3].ok ? <Check className="size-4" strokeWidth={2.5} aria-hidden="true" /> : <Circle className="size-4" aria-hidden="true" />}{t(rules[3].ok ? "Both match" : "They don't match yet")}</span> : undefined}>
            <PasswordField id="vault-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" placeholder={t("Type the new vault password again")} />
          </Field>
          {mode === "reset" && (
            <label className="flex items-start gap-3 text-small text-ink-2">
              <Checkbox checked={agreed} onCheckedChange={(next) => setAgreed(next === true)} className="mt-0.5" />
              {t("I understand that every saved login will be deleted.")}
            </label>
          )}
          <Button type="submit" size="xl" variant={mode === "reset" ? "danger" : "action"} disabled={!valid || isPending} className="w-full">
            {isPending && <Loader />}
            {t(copy.button)}
          </Button>
          {mode !== "setup" && (
            <button type="button" onClick={onBack} disabled={isPending} className="flex items-center gap-2 self-center text-body font-semibold text-ink-2 hover:text-ink">
              <ArrowLeft className="size-4" aria-hidden="true" />
              {t("Back to unlock")}
            </button>
          )}
        </form>
      </GateCard>

      {mode === "setup" && (
        <GateAside aria-labelledby="vault-why">
          <h3 id="vault-why" className="text-title font-semibold text-ink">
            {t("Why a second password?")}
          </h3>
          <p className="text-small leading-relaxed text-ink-2">{t("Your vault holds the keys to your other accounts. A separate password means someone using your phone or laptop while you're logged in still can't open it.")}</p>
          <div className="flex flex-col gap-3 rounded-lg bg-cream p-4">
            <span className="text-small font-semibold text-ink">{t("A good vault password")}</span>
            {TIPS.map((tip) => (
              <span key={tip} className="flex gap-2 text-small leading-normal text-ink-2">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald" strokeWidth={2.5} aria-hidden="true" />
                {t(tip)}
              </span>
            ))}
          </div>
          <p className="text-small leading-normal text-ink-muted">{t("Forgot it later? You can set a new one with your account password, but the logins saved under the old one are deleted, so keep it somewhere safe.")}</p>
        </GateAside>
      )}
    </>
  );
}
