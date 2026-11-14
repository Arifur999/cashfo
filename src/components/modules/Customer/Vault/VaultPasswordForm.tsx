"use client";

import { Check, ChevronLeft, Info, KeyRound, Mail, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import {
  resendVaultResetCodeAction,
  resetVaultAction,
  sendSetPasswordLinkAction,
  setVaultPasswordAction,
  startVaultResetAction,
  unlockVaultAction,
  type VaultResetChallenge,
  type VaultResult,
  type VaultUnlock,
} from "@/lib/customer/passwordVaultActions";
import { countdownText, passwordStrength, settle, VAULT_PASSWORD_REASONS, vaultRules, type Rule } from "@/lib/customer/vaultDisplay";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PasswordField } from "@/components/modules/Customer/Shared/PasswordField";
import { GateAside, GateCard } from "./VaultGate";

export type VaultPasswordMode = "setup" | "reset";

interface VaultPasswordFormProps {
  mode: VaultPasswordMode;
  // false for a Google-only account, which has no account password to give.
  hasAccountPassword?: boolean;
  // The signed-in person's name: a vault password may not contain it.
  userName?: string;
  // The first password opened the new vault straight away: it was typed
  // twice already, so it isn't asked a third time.
  onUnlocked: (unlock: VaultUnlock) => void;
  // Set up, and the vault wants the emailed code before it opens (an API
  // that doesn't open a new vault by itself): on to the code step.
  onCode: (challenge: VaultResetChallenge) => void;
  // Back to the unlock form: "changed" after a reset, which the form then
  // says.
  onDone: (reason?: "changed") => void;
  onBack: () => void;
}

const COPY: Record<VaultPasswordMode, { title: string; sub: string; button: string; opened: string; success: string; failure: string }> = {
  setup: { title: "Set up your vault password", sub: "One time. You'll use it to open this page.", button: "Set vault password", opened: "Vault password set", success: "Vault password set. Unlock below to continue.", failure: "Failed to set vault password" },
  reset: { title: "Reset your vault password", sub: "Confirm your account password, then pick a new one.", button: "Reset vault password", opened: "Vault password reset. Your saved logins are all there.", success: "Vault password reset. Unlock below to continue.", failure: "Failed to reset the vault" },
};

// The API's words for a wrong account password, shown under its box.
const WRONG_ACCOUNT_PASSWORD = "Your account password is incorrect";
// A code that can't be used any more: the reset starts again with a new one.
const CODE_GONE = new Set(["CODE_EXPIRED", "TOO_MANY_ATTEMPTS", "CODE_USED", "CHALLENGE_NOT_FOUND", "TOO_MANY_SENDS"]);

const TIPS = ["Three or four unrelated words, like a short sentence only you would write", "Not your name, phone number, birthday or 123", "Not used anywhere else, including your Smartly login"];

type FieldKey = "account" | "new" | "confirm" | "code";

// The boards' field: a 14px label 6px over a 46px box, its line under it.
const FIELD = "flex flex-col gap-1.5";
const LABEL = "text-body leading-[normal] font-medium text-ink";
const BOX = "h-11.5 text-[15px] max-md:text-body-lg";

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <span id={id} role="alert" className="text-[12.5px] leading-[normal] text-expense">
      {children}
    </span>
  );
}

// The side note on set-up: why a second password, and what makes a good one.
function SetupAside() {
  const { t } = useLocale();
  return (
    <GateAside aria-labelledby="vault-why">
      <h3 id="vault-why" className="text-[15px] leading-[normal] font-semibold text-ink">
        {t("Why a second password?")}
      </h3>
      <p className="text-[13.5px] leading-[1.55] text-ink-2">{t("Your vault holds the keys to your other accounts. A separate password means someone using your phone or laptop while you're logged in still can't open it.")}</p>
      <div className="flex flex-col gap-2 rounded-[12px] bg-strip p-3.5">
        <span className="text-[13.5px] leading-[normal] font-semibold text-ink">{t("A good vault password")}</span>
        {TIPS.map((tip) => (
          <span key={tip} className="flex gap-2 text-[13px] leading-[1.45] text-ink-2">
            <Check className="mt-0.75 size-3.25 shrink-0 text-brand-ink" strokeWidth={2.75} aria-hidden="true" />
            {t(tip)}
          </span>
        ))}
      </div>
      <p className="text-[13px] leading-normal text-ink-muted">{t("Forgot it later? You can set a new one with your account password, and your saved logins stay as they are.")}</p>
    </GateAside>
  );
}

function FormTitle({ mode, sub }: { mode: VaultPasswordMode; sub?: string }) {
  const { t } = useLocale();
  const copy = COPY[mode];
  return (
    <div className="flex items-center gap-3.5">
      <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-emerald-soft text-brand-ink">
        {mode === "setup" ? <ShieldCheck className="size-6" /> : <KeyRound className="size-5.5" />}
      </span>
      <div className="flex flex-col gap-0.5">
        <h2 id="vault-form-title" className="text-[19px] leading-[normal] font-semibold text-ink">
          {t(copy.title)}
        </h2>
        <span className="text-[13.5px] leading-[normal] text-ink-muted">{t(sub ?? copy.sub)}</span>
      </div>
    </div>
  );
}

// "Your saved logins stay as they are." on a reset.
function KeepsLogins() {
  const { t } = useLocale();
  return (
    <div role="note" className="flex gap-2 rounded-[10px] border border-emerald-line bg-emerald-soft px-3 py-2.5 text-[13px] leading-normal text-forest dark:text-mint-200">
      <Check className="mt-0.5 size-3.5 shrink-0 text-emerald" strokeWidth={2.5} aria-hidden="true" />
      <span>{t("Your saved logins stay as they are. Only the password that opens the vault changes.")}</span>
    </div>
  );
}

function BackButton({ onBack, disabled }: { onBack: () => void; disabled?: boolean }) {
  const { t } = useLocale();
  return (
    <button type="button" onClick={onBack} disabled={disabled} className="-my-2 flex min-h-9 items-center justify-center gap-1.5 self-center rounded-md px-2 text-[13.5px] font-medium text-ink-2 hover:text-ink pointer-coarse:min-h-11">
      <ChevronLeft className="size-3.5" aria-hidden="true" />
      {t("Back to unlock")}
    </button>
  );
}

// The meter under a new vault password (VaultSetup, VaultReset): four
// bars across the width and the word at the end.
const METER_BAR = ["bg-line", "bg-expense-fill", "bg-warning-fill", "bg-jade", "bg-emerald"];
const METER_TEXT = ["", "text-expense", "text-warning-fill", "text-jade", "text-emerald"];

function VaultMeter({ password }: { password: string }) {
  const { t } = useLocale();
  const { score, label } = passwordStrength(password);
  const word = label === "Too short" ? "Weak" : label;
  return (
    <div className="-mt-1.5 flex items-center gap-1.5" role="img" aria-label={password ? `${t("Strength")}: ${t(`${word}@@password strength`)}` : t("Strength")}>
      {[1, 2, 3, 4].map((bar) => (
        <span key={bar} aria-hidden="true" className={cn("h-1 flex-1 rounded-full", password && bar <= Math.max(score, 1) ? METER_BAR[Math.max(score, 1)] : "bg-line")} />
      ))}
      <span aria-hidden="true" className={cn("min-w-13 text-right text-[12.5px] leading-[normal] font-bold", METER_TEXT[Math.max(score, 1)])}>
        {password ? t(`${word}@@password strength`) : ""}
      </span>
    </div>
  );
}

// A Google-only account: no account password, so nothing to prove it's
// them for setting up the vault password. Says so before any typing, mails
// the link that sets one, and points to Settings › Security, where the
// account's password lives. (A reset needs none: a recent sign-in and the
// emailed code stand in for it.)
function NoAccountPassword({ mode }: Pick<VaultPasswordFormProps, "mode">) {
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
        <Button size="xl" variant="secondary" asChild className="w-full">
          <Link href="/settings/security">
            <Settings />
            {t("Open Settings › Security")}
          </Link>
        </Button>
      </GateCard>
      <SetupAside />
    </>
  );
}

// Set up or reset the vault password. A reset keeps the saved logins (the
// server's key seals them, not the vault password); it asks for the account
// password and a code the API emails, then the new password.
export function VaultPasswordForm(props: VaultPasswordFormProps) {
  return props.hasAccountPassword === false && props.mode === "setup" ? <NoAccountPassword mode={props.mode} /> : <PasswordForm {...props} />;
}

// The rule list under a new password (VaultSetup): ticked when met, a dot
// while not.
function RuleList({ rules, id }: { rules: Rule[]; id: string }) {
  const { t } = useLocale();
  return (
    <ul id={id} className="-mt-1 grid gap-x-3 gap-y-1 sm:grid-cols-2" aria-label={t("Rules")}>
      {rules.map((rule) => (
        <li key={rule.key} className={cn("flex items-center gap-1.5 text-[12.5px] leading-[normal]", rule.ok ? "text-brand-ink" : "text-ink-faint")}>
          {rule.ok ? <Check className="size-3.25 shrink-0" strokeWidth={2.75} aria-hidden="true" /> : <span aria-hidden="true" className="flex size-3.25 shrink-0 items-center justify-center"><span className="size-0.75 rounded-full bg-current" /></span>}
          {t(rule.label)}
          <span className="sr-only">, {t(rule.ok ? "Done@@rule" : "Not yet@@rule")}</span>
        </li>
      ))}
    </ul>
  );
}

// The API's words for each rule, said above the button when it breaks one
// (backend vault-password-rule.ts).
const RULE_MESSAGES: Partial<Record<Rule["key"], string>> = {
  length: "Use at least 8 characters with both letters and numbers.",
  mix: "Use at least 8 characters with both letters and numbers.",
  noName: "Your vault password should not contain your name.",
  notAccount: "Your vault password must be different from the password you log in with.",
};

function PasswordForm({ mode, hasAccountPassword = true, userName, onUnlocked, onCode, onDone, onBack }: VaultPasswordFormProps) {
  const { t, fmt } = useLocale();
  const [accountPassword, setAccountPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // The eye on the new password shows the second box too (VaultSetup).
  const [shown, setShown] = useState(false);
  // A reset's emailed code: the challenge it answers and what was typed.
  const [challenge, setChallenge] = useState<VaultResetChallenge | null>(null);
  const [code, setCode] = useState("");
  // When the code may be sent again, in epoch milliseconds.
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(0);
  // A problem under the box it belongs to, or one for the whole form.
  const [wrong, setWrong] = useState<{ field: FieldKey; message: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isResending, startResend] = useTransition();

  const reset = mode === "reset";
  const needsAccount = hasAccountPassword !== false;
  const rules = vaultRules(password, confirm, accountPassword, userName);
  const newRules = rules.filter((rule) => rule.key !== "match");
  const copy = COPY[mode];
  const strength = passwordStrength(password);

  // The resend wait ticks while a code is out.
  useEffect(() => {
    if (!challenge) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [challenge]);

  const wrongFor = (field: FieldKey) => (wrong?.field === field ? wrong.message : undefined);
  const clearWrong = (field: FieldKey) => {
    if (wrong?.field === field) setWrong(null);
    setNotice(null);
  };

  // Where a refusal goes: under its box, else above the button.
  function refused(result: VaultResult<unknown>) {
    const message = t(result.message ?? copy.failure);
    const rule = result.reason ? VAULT_PASSWORD_REASONS[result.reason] : undefined;
    if (result.message === WRONG_ACCOUNT_PASSWORD) setWrong({ field: "account", message });
    else if (rule) setWrong({ field: "new", message });
    else if (result.reason === "CODE_WRONG") {
      const left = result.attemptsLeft;
      setWrong({ field: "code", message: left === undefined ? message : t(left === 1 ? "That code is not right. {count} try left." : "That code is not right. {count} tries left.", { count: formatCount(left, fmt) }) });
    } else if (result.reason && CODE_GONE.has(result.reason)) {
      setChallenge(null);
      setCode("");
      setNotice(message);
    } else setNotice(message);
  }

  // A new vault opens with its first password: the API's token, else the
  // first unlock step (the code step, or an older API's token straight
  // away), else the unlock form.
  async function openWith(newPassword: string) {
    const opened = await settle(unlockVaultAction(newPassword));
    if (opened.success && opened.data?.step === "open") {
      toast.success(t(copy.opened));
      onUnlocked(opened.data);
    } else if (opened.success && opened.data?.step === "code") {
      toast.success(t(copy.opened));
      onCode(opened.data);
    } else {
      toast.success(t(copy.success));
      onDone();
    }
  }

  function sent(next: VaultResetChallenge) {
    setChallenge(next);
    setNow(Date.now());
    setResendAt(Date.now() + next.resendAfterSec * 1000);
    setNotice(null);
    setWrong(null);
    // The code box comes in above the button; it takes focus.
    requestAnimationFrame(() => document.getElementById("vault-code")?.focus());
  }

  // What stops a press, said above the button (VaultSetup's red box).
  function firstProblem(): string | null {
    if (needsAccount && !accountPassword) return t("Enter the password you use to log in to Smartly.");
    const broken = newRules.find((rule) => !rule.ok);
    if (broken) return t(RULE_MESSAGES[broken.key] ?? "Use at least 8 characters with both letters and numbers.");
    if (password !== confirm) return t("The two passwords don't match.");
    if (reset && challenge && code.length !== 6) return t("Type all 6 digits from the email.");
    return null;
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending) return;
    const problem = firstProblem();
    if (problem) {
      setWrong(null);
      setNotice(problem);
      return;
    }
    setNotice(null);
    startTransition(async () => {
      const currentPassword = needsAccount ? accountPassword : undefined;
      if (reset && !challenge) {
        const started = await settle(startVaultResetAction({ currentPassword }));
        if (started.success && started.data) sent(started.data);
        else refused(started);
        return;
      }
      const result =
        reset && challenge ? await settle(resetVaultAction({ currentPassword, vaultPassword: password, challengeId: challenge.challengeId, code })) : await settle(setVaultPasswordAction({ currentPassword: accountPassword, vaultPassword: password }));
      if (!result.success) {
        refused(result);
        return;
      }
      // A reset locks the vault: the unlock form says to use the new one.
      if (reset) {
        onDone("changed");
        return;
      }
      const token = result.data && "vaultToken" in result.data ? result.data : null;
      if (token) {
        toast.success(t(copy.opened));
        onUnlocked(token);
      } else await openWith(password);
    });
  }

  function resend() {
    if (!challenge || isResending) return;
    startResend(async () => {
      const result = await settle(resendVaultResetCodeAction(challenge.challengeId));
      if (result.success && result.data) {
        sent(result.data);
        toast.success(t("We sent a new code to {email}.", { email: result.data.sentTo }));
      } else if (result.reason === "RESEND_TOO_SOON" && result.retryAfterSec) {
        setResendAt(Date.now() + result.retryAfterSec * 1000);
      } else refused(result);
    });
  }

  const resendLeft = resendAt - now;
  const advice = reset && password.length > 0 && strength.score < 3;
  const matchShown = !reset && confirm.length > 0;

  return (
    <>
      <GateCard aria-labelledby="vault-form-title">
        <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
          <FormTitle mode={mode} sub={reset && !needsAccount ? "Pick a new one, then confirm it with a code we email you." : undefined} />

          {reset && <KeepsLogins />}

          {needsAccount && (
            <div className={FIELD}>
              <label htmlFor="vault-account" className={LABEL}>
                {t("Your account password")}
              </label>
              <Input
                id="vault-account"
                type="password"
                value={accountPassword}
                onChange={(event) => {
                  setAccountPassword(event.target.value);
                  clearWrong("account");
                }}
                invalid={wrong?.field === "account"}
                aria-describedby={wrong?.field === "account" ? "vault-account-error" : reset ? undefined : "vault-account-hint"}
                autoComplete="current-password"
                autoFocus
                placeholder={t("The one you log in with")}
                size="lg"
                frameClassName={BOX}
              />
              {wrong?.field === "account" ? (
                <FieldError id="vault-account-error">{wrong.message}</FieldError>
              ) : (
                !reset && (
                  <span id="vault-account-hint" className="text-caption leading-[normal] text-ink-muted">
                    {t("The one you log in with. It proves this is really you.")}
                  </span>
                )
              )}
            </div>
          )}
          <div className={FIELD}>
            <label htmlFor="vault-new" className={LABEL}>
              {t("New vault password")}
            </label>
            {reset ? (
              <Input
                id="vault-new"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearWrong("new");
                }}
                invalid={wrong?.field === "new"}
                aria-describedby={wrong?.field === "new" ? "vault-new-error" : undefined}
                autoComplete="new-password"
                autoFocus={!needsAccount}
                placeholder={t("Three or four words you'll remember")}
                size="lg"
                frameClassName={BOX}
              />
            ) : (
              <PasswordField
                id="vault-new"
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  clearWrong("new");
                }}
                visible={shown}
                onVisibleChange={setShown}
                invalid={wrong?.field === "new"}
                aria-describedby={wrong?.field === "new" ? "vault-new-error" : "vault-rules"}
                autoComplete="new-password"
                placeholder={t("Three or four words you'll remember")}
                size="lg"
                frameClassName={cn(BOX, password && wrong?.field !== "new" && "border-emerald")}
              />
            )}
            {wrong?.field === "new" && <FieldError id="vault-new-error">{wrong.message}</FieldError>}
          </div>
          <VaultMeter password={password} />
          {advice && <span className="-mt-1.5 text-[12.5px] leading-[1.45] text-due-ink">{t("Add a couple more words to make it strong. Avoid your name and 123.")}</span>}
          {!reset && <RuleList rules={newRules} id="vault-rules" />}
          <div className={FIELD}>
            <label htmlFor="vault-confirm" className={LABEL}>
              {t("Type it again")}
            </label>
            <Input
              id="vault-confirm"
              type={shown && !reset ? "text" : "password"}
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value);
                clearWrong("confirm");
              }}
              invalid={wrong?.field === "confirm"}
              autoComplete="new-password"
              placeholder={t("Type the new vault password again")}
              aria-describedby={matchShown ? "vault-confirm-hint" : undefined}
              size="lg"
              frameClassName={BOX}
            />
            {matchShown && (
              <span id="vault-confirm-hint" className={cn("text-[12.5px] leading-[normal]", rules[4].ok ? "text-emerald" : "text-expense")}>
                {rules[4].ok ? `✓ ${t("Both match")}` : t("These don't match yet")}
              </span>
            )}
          </div>

          {/* A reset's second step: the code the API emailed. */}
          {challenge && (
            <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-strip p-3.5">
              <span className="flex items-start gap-2 text-small leading-normal text-ink-2">
                <Mail className="mt-0.5 size-4 shrink-0 text-emerald" aria-hidden="true" />
                {challenge.channel === "SMS"
                  ? t("We sent a 6-digit code by SMS to {phone}. Enter it to finish. It works for 10 minutes.", { phone: challenge.sentTo })
                  : t("We sent a 6-digit code to {email}. Enter it to finish. It works for 10 minutes.", { email: challenge.sentTo })}
              </span>
              <div className={FIELD}>
                <label htmlFor="vault-code" className={LABEL}>
                  {challenge.channel === "SMS" ? t("Code from the SMS") : t("Code from the email")}
                </label>
                <Input
                  id="vault-code"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    clearWrong("code");
                  }}
                  invalid={wrong?.field === "code"}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  size="lg"
                  frameClassName="h-11.5 bg-surface"
                  className="font-mono text-body-lg tracking-[0.3em]"
                />
                {wrong?.field === "code" && <FieldError id="vault-code-error">{wrong.message}</FieldError>}
              </div>
              <div className="-my-1 flex flex-wrap items-center justify-between gap-x-3 text-small">
                <span className="text-ink-muted">{t("Didn't get it?")}</span>
                <button type="button" onClick={resend} disabled={isResending || resendLeft > 0} className="flex min-h-9 items-center rounded-md font-semibold text-emerald hover:underline disabled:text-ink-muted disabled:no-underline pointer-coarse:min-h-11">
                  {resendLeft > 0 ? t("Send again in {time}", { time: toLocaleDigits(countdownText(resendLeft), fmt) }) : t("Send the code again")}
                </button>
              </div>
            </div>
          )}

          {notice && (
            <p role="alert" className="rounded-[10px] bg-expense-soft px-3.5 py-2.5 text-[13px] leading-normal font-medium text-expense">
              {notice}
            </p>
          )}

          <Button type="submit" size="xl" variant="action" disabled={isPending} className="h-12 w-full text-[15px]">
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {t(copy.button)}
          </Button>
          {reset && <BackButton onBack={onBack} disabled={isPending} />}
        </form>
      </GateCard>

      {mode === "setup" && <SetupAside />}
    </>
  );
}
