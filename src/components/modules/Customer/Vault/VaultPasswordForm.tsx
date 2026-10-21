"use client";

import { ArrowLeft, Check, Circle, Info, KeyRound, Mail, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import IconTile from "@/components/smartly/IconTile";
import { Checkbox } from "@/components/ui/checkbox";
import { resetVaultAction, sendSetPasswordLinkAction, setVaultPasswordAction, unlockVaultAction } from "@/lib/customer/passwordVaultActions";
import { rulesMet, settle, vaultRules } from "@/lib/customer/vaultDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PasswordField } from "@/components/modules/Customer/Shared/PasswordField";
import { StrengthMeter } from "@/components/modules/Customer/Shared/StrengthMeter";
import { GateAside, GateCard } from "./VaultGate";

export type VaultPasswordMode = "setup" | "change" | "reset";

interface VaultPasswordFormProps {
  mode: VaultPasswordMode;
  // How many logins the vault holds, when known: a reset says how many go.
  entryCount?: number;
  // false for a Google-only account, which has no account password to give.
  hasAccountPassword?: boolean;
  // The new password opened the vault straight away: it was typed twice
  // already, so it isn't asked a third time.
  onUnlocked: (vaultToken: string, expiresIn: string) => void;
  // Set, but the vault didn't open with it: back to the unlock form.
  onDone: () => void;
  onBack: () => void;
}

const COPY: Record<VaultPasswordMode, { title: string; sub: string; button: string; opened: string; success: string; failure: string }> = {
  setup: { title: "Set up your vault password", sub: "One time. You'll use it to open this page.", button: "Set vault password", opened: "Vault password set", success: "Vault password set. Unlock below to continue.", failure: "Failed to set vault password" },
  change: { title: "Change your vault password", sub: "Your account password and the current vault password, then the new one.", button: "Change vault password", opened: "Vault password changed", success: "Vault password changed. Unlock below to continue.", failure: "Failed to set vault password" },
  reset: { title: "Reset your vault password", sub: "Confirm your account password, then pick a new one.", button: "Delete saved logins and reset", opened: "Vault reset", success: "Vault reset. Unlock below to continue.", failure: "Failed to reset the vault" },
};

// The API's words for a wrong password, shown under the box they belong to.
const WRONG_ACCOUNT_PASSWORD = "Your account password is incorrect";
const WRONG_VAULT_PASSWORD = "Your current vault password is incorrect. Forgot it? Reset the vault instead (this deletes the saved entries).";

const TIPS = ["Three or four unrelated words, like a short sentence only you would write", "Not your name, phone number, birthday or 123", "Not used anywhere else, including your Smartly login"];

const label = (text: string) => <span className="text-body font-medium text-ink">{text}</span>;

// The side note on set-up: why a second password, and what makes a good one.
function SetupAside() {
  const { t } = useLocale();
  return (
    <GateAside aria-labelledby="vault-why">
      <h3 id="vault-why" className="text-title text-ink">
        {t("Why a second password?")}
      </h3>
      <p className="text-small leading-relaxed text-ink-2">{t("Your vault holds the keys to your other accounts. A separate password means someone using your phone or laptop while you're logged in still can't open it.")}</p>
      <div className="flex flex-col gap-3 rounded-lg bg-strip p-4">
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
  );
}

function FormTitle({ mode }: { mode: VaultPasswordMode }) {
  const { t } = useLocale();
  const copy = COPY[mode];
  return (
    <div className="flex items-center gap-4">
      <IconTile size={48} tone={mode === "reset" ? "warning" : "money"} className="rounded-lg">
        {mode === "change" ? <KeyRound /> : <ShieldCheck />}
      </IconTile>
      <div className="flex flex-col gap-0.5">
        <h2 id="vault-form-title" className="text-h2 text-ink">
          {t(copy.title)}
        </h2>
        <span className="text-body text-ink-muted">{t(copy.sub)}</span>
      </div>
    </div>
  );
}

function BackButton({ onBack, disabled }: { onBack: () => void; disabled?: boolean }) {
  const { t } = useLocale();
  return (
    <button type="button" onClick={onBack} disabled={disabled} className="flex min-h-11 items-center gap-2 self-center rounded-md px-2 text-body font-semibold text-ink-2 hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden="true" />
      {t("Back to unlock")}
    </button>
  );
}

// A Google-only account: no account password, so nothing to prove it's
// them yet. Says so before any typing, and mails the link that sets one.
function NoAccountPassword({ mode, onBack }: Pick<VaultPasswordFormProps, "mode" | "onBack">) {
  const { t } = useLocale();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function send() {
    if (isPending) return;
    startTransition(async () => {
      const result = await settle(sendSetPasswordLinkAction());
      if (result.success && result.data) setSentTo(result.data.email);
      else toast.error(t(result.message ?? "We couldn't send the link. Please try again."));
    });
  }

  return (
    <>
      <GateCard aria-labelledby="vault-form-title">
        <div className="flex flex-col gap-4">
          <FormTitle mode={mode} />
          <Banner inline tone="info" icon={<Info />} role="note">
            <b className="font-semibold">{t("Your account has no password yet.")}</b> {t("You sign in with Google, so there is no account password to prove it's you. Set one first, then come back here.")}
          </Banner>
          {sentTo && (
            <Banner inline tone="mint" icon={<Mail />}>
              {t("We sent a link to {email}. Open it to set a password, then come back here.", { email: sentTo })}
            </Banner>
          )}
          <Button size="xl" variant="action" onClick={send} disabled={isPending} className="w-full">
            {isPending ? <Loader size={16} onDark label={t("Loading...")} /> : <Mail />}
            {t(sentTo ? "Send the link again" : "Email me a link to set one")}
          </Button>
          {mode !== "setup" && <BackButton onBack={onBack} disabled={isPending} />}
        </div>
      </GateCard>
      {mode === "setup" && <SetupAside />}
    </>
  );
}

// Set, change or reset the vault password. A reset deletes the saved logins
// (they are locked with the forgotten password), and the form says so.
export function VaultPasswordForm(props: VaultPasswordFormProps) {
  return props.hasAccountPassword === false ? <NoAccountPassword mode={props.mode} onBack={props.onBack} /> : <PasswordForm {...props} />;
}

function PasswordForm({ mode, entryCount, onUnlocked, onDone, onBack }: VaultPasswordFormProps) {
  const { t, locale } = useLocale();
  const [accountPassword, setAccountPassword] = useState("");
  const [currentVaultPassword, setCurrentVaultPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  // A wrong password, under the box it belongs to.
  const [wrong, setWrong] = useState<{ field: "account" | "current"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const rules = vaultRules(password, confirm, accountPassword);
  const valid = accountPassword.length > 0 && rulesMet(rules) && (mode !== "change" || currentVaultPassword.length > 0) && (mode !== "reset" || agreed);
  const copy = COPY[mode];
  // What the button waits for, the passwords asked above first.
  const checklist = [
    { key: "account", label: "Your account password", ok: accountPassword.length > 0 },
    ...(mode === "change" ? [{ key: "current", label: "Current vault password", ok: currentVaultPassword.length > 0 }] : []),
    ...rules.filter((rule) => rule.key !== "match"),
  ];
  const count = entryCount !== undefined && entryCount > 0 ? formatCount(entryCount, locale) : null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const result = await (mode === "reset" ? settle(resetVaultAction({ currentPassword: accountPassword, vaultPassword: password })) : settle(setVaultPasswordAction({ currentPassword: accountPassword, vaultPassword: password, ...(mode === "change" && { currentVaultPassword }) })));
      if (!result.success) {
        if (result.message === WRONG_ACCOUNT_PASSWORD) setWrong({ field: "account", message: t(result.message) });
        else if (result.message === WRONG_VAULT_PASSWORD) setWrong({ field: "current", message: t(result.message) });
        else toast.error(t(result.message ?? copy.failure));
        return;
      }
      // The new password was just typed twice: open the vault with it.
      const opened = await settle(unlockVaultAction(password));
      if (opened.success && opened.data) {
        toast.success(t(copy.opened));
        onUnlocked(opened.data.vaultToken, opened.data.expiresIn);
      } else {
        toast.success(t(copy.success));
        onDone();
      }
    });
  }

  const wrongFor = (field: "account" | "current") => (wrong?.field === field ? wrong.message : undefined);

  return (
    <>
      <GateCard aria-labelledby="vault-form-title">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <FormTitle mode={mode} />

          {mode === "reset" && (
            <Banner inline tone="warning" icon={<TriangleAlert />} role="alert">
              <b className="font-semibold">{count ? t(entryCount === 1 ? "{count} saved login will be deleted." : "{count} saved logins will be deleted.", { count }) : t("Your saved logins will be deleted.")}</b> {t("They are locked with the forgotten password, so they can't be opened again.")}
            </Banner>
          )}
          {mode === "change" && (
            <Banner inline tone="mint" icon={<Info />} role="note">
              <b className="font-semibold">{t("Your saved logins stay as they are.")}</b> {t("Only the password that opens the vault changes.")}
            </Banner>
          )}

          <Field htmlFor="vault-account" label={label(t("Your account password"))} hint={mode === "setup" ? t("The one you log in with. It proves this is really you.") : undefined} error={wrongFor("account")}>
            <PasswordField
              id="vault-account"
              value={accountPassword}
              onChange={(value) => {
                setAccountPassword(value);
                if (wrong?.field === "account") setWrong(null);
              }}
              invalid={wrong?.field === "account"}
              aria-describedby={wrong?.field === "account" ? "vault-account-error" : mode === "setup" ? "vault-account-hint" : undefined}
              autoComplete="current-password"
              autoFocus
              className="max-md:text-body-lg"
            />
          </Field>
          {mode === "change" && (
            <Field htmlFor="vault-current" label={label(t("Current vault password"))} error={wrongFor("current")}>
              <PasswordField
                id="vault-current"
                value={currentVaultPassword}
                onChange={(value) => {
                  setCurrentVaultPassword(value);
                  if (wrong?.field === "current") setWrong(null);
                }}
                invalid={wrong?.field === "current"}
                autoComplete="off"
                className="max-md:text-body-lg"
              />
            </Field>
          )}
          <Field htmlFor="vault-new" label={label(t("New vault password"))}>
            <PasswordField id="vault-new" value={password} onChange={setPassword} autoComplete="new-password" aria-describedby="vault-rules" className="max-md:text-body-lg" />
          </Field>
          <StrengthMeter password={password} className="-mt-2" />
          <ul id="vault-rules" className="-mt-1 grid gap-x-3 gap-y-2 sm:grid-cols-2" aria-label={t("Rules")}>
            {checklist.map((rule) => (
              <li key={rule.key} className={cn("flex items-center gap-2 text-small", rule.ok ? "text-income" : "text-ink-muted")}>
                {rule.ok ? <Check className="size-4 shrink-0" strokeWidth={2.5} aria-hidden="true" /> : <Circle className="size-4 shrink-0" aria-hidden="true" />}
                {t(rule.label)}
                <span className="sr-only">, {t(rule.ok ? "Done@@rule" : "Not yet@@rule")}</span>
              </li>
            ))}
          </ul>
          <Field
            htmlFor="vault-confirm"
            label={label(t("Type it again"))}
            hint={
              confirm.length > 0 ? (
                <span className={cn("flex items-center gap-2", rules[3].ok ? "text-income" : "text-expense")}>
                  {rules[3].ok ? <Check className="size-4" strokeWidth={2.5} aria-hidden="true" /> : <Circle className="size-4" aria-hidden="true" />}
                  {t(rules[3].ok ? "Both match" : "They don't match yet")}
                </span>
              ) : undefined
            }
          >
            <PasswordField
              id="vault-confirm"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              placeholder={t("Type the new vault password again")}
              aria-describedby={confirm.length > 0 ? "vault-confirm-hint" : undefined}
              className="max-md:text-body-lg"
            />
          </Field>
          {mode === "reset" && (
            <label className="flex items-start gap-3 text-small text-ink-2">
              <Checkbox checked={agreed} onCheckedChange={(next) => setAgreed(next === true)} className="mt-0.5" />
              {t("I understand that every saved login will be deleted.")}
            </label>
          )}
          <Button type="submit" size="xl" variant={mode === "reset" ? "danger" : "action"} disabled={!valid || isPending} className="w-full">
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {mode === "reset" && count ? t(entryCount === 1 ? "Delete {count} login and reset" : "Delete {count} logins and reset", { count }) : t(copy.button)}
          </Button>
          {mode !== "setup" && <BackButton onBack={onBack} disabled={isPending} />}
        </form>
      </GateCard>

      {mode === "setup" && <SetupAside />}
    </>
  );
}
