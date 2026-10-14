"use client";

import { KeyRound, Lock, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/modules/Customer/Shared/PasswordInput";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getVaultStatusAction, resetVaultAction, setVaultPasswordAction, unlockVaultAction } from "@/lib/customer/passwordVaultActions";

interface VaultUnlockGateProps {
  onUnlocked: (vaultToken: string) => void;
}

type Mode = "loading" | "setup" | "unlock" | "reset" | "change";

// Gates the whole Password Manager page -- shown every time the page loads
// (the unlocked vaultToken lives only in PasswordVaultPageClient's React
// state, never a cookie, so navigating away and back always re-locks). First
// visit ever shows the "set up" form (requires the account password once, to
// prove it's really the account owner); every visit after that shows the
// plain "unlock" form, with two ways on:
// - "change": a new vault password, given the account password AND the
//   current vault password;
// - "reset" ("Forgot vault password?"): the saved entries are encrypted with
//   the forgotten password, so they can't be kept -- resetting deletes them
//   all, and the form says so and asks for a confirmation first.
export function VaultUnlockGate({ onUnlocked }: VaultUnlockGateProps) {
  const { t } = useLocale();
  const [mode, setMode] = useState<Mode>("loading");

  const [currentPassword, setCurrentPassword] = useState("");
  const [currentVaultPassword, setCurrentVaultPassword] = useState("");
  const [vaultPassword, setVaultPassword] = useState("");
  const [confirmVaultPassword, setConfirmVaultPassword] = useState("");
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getVaultStatusAction().then((result) => {
      setMode(result.success && result.data?.hasVaultPassword ? "unlock" : "setup");
    });
  }, []);

  // Every switch starts the next form empty, so nothing typed for one (a
  // wrong unlock guess, say) lands in an unrelated field of another.
  function switchTo(next: Mode) {
    setCurrentPassword("");
    setCurrentVaultPassword("");
    setVaultPassword("");
    setConfirmVaultPassword("");
    setConfirmDeletion(false);
    setMode(next);
  }

  function checkNewPassword(): boolean {
    if (!currentPassword) {
      toast.error(t("Enter your account password"));
      return false;
    }
    if (vaultPassword.length < 6) {
      toast.error(t("Vault password must be at least 6 characters"));
      return false;
    }
    // Same rules as the API (6-128 characters, a letter and a number), so
    // the reason shows here instead of as a rejected request.
    if (vaultPassword.length > 128) {
      toast.error(t("Vault password must be at most 128 characters"));
      return false;
    }
    if (!/[A-Za-z]/.test(vaultPassword) || !/d/.test(vaultPassword)) {
      toast.error(t("Vault password must contain at least one letter and one number"));
      return false;
    }
    if (vaultPassword !== confirmVaultPassword) {
      toast.error(t("Vault passwords don't match"));
      return false;
    }
    return true;
  }

  function handleSetupOrChange() {
    if (!checkNewPassword()) return;
    if (mode === "change" && !currentVaultPassword) {
      toast.error(t("Enter your current vault password"));
      return;
    }
    const isChange = mode === "change";
    startTransition(async () => {
      const result = await setVaultPasswordAction({ currentPassword, vaultPassword, ...(isChange && { currentVaultPassword }) });
      if (result.success) {
        toast.success(isChange ? t("Vault password changed -- unlock below to continue") : t("Vault password set -- unlock below to continue"));
        switchTo("unlock");
      } else {
        toast.error(result.message ?? t("Failed to set vault password"));
      }
    });
  }

  function handleReset() {
    if (!checkNewPassword()) return;
    if (!confirmDeletion) {
      toast.error(t("Tick the box to confirm that every saved password will be deleted"));
      return;
    }
    startTransition(async () => {
      const result = await resetVaultAction({ currentPassword, vaultPassword });
      if (result.success) {
        toast.success(`${t("Vault reset -- saved passwords deleted:")} ${result.data?.deletedEntries ?? 0}`);
        switchTo("unlock");
      } else {
        toast.error(result.message ?? t("Failed to reset the vault"));
      }
    });
  }

  function handleUnlock() {
    if (!vaultPassword) {
      toast.error(t("Enter your vault password"));
      return;
    }
    startTransition(async () => {
      const result = await unlockVaultAction(vaultPassword);
      if (result.success && result.data) {
        setVaultPassword("");
        onUnlocked(result.data.vaultToken);
      } else {
        toast.error(result.message ?? t("Incorrect vault password"));
      }
    });
  }

  if (mode === "loading") {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const field = (label: string, value: string, onChange: (v: string) => void) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>
      <PasswordInput value={value} onChange={onChange} />
    </div>
  );
  const primaryButton = (label: string, onClick: () => void, danger = false) => (
    <button
      type="button"
      disabled={isPending}
      onClick={onClick}
      className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 ${
        danger ? "bg-brand-danger hover:bg-brand-danger-hover" : "bg-brand-primary hover:bg-brand-primary-hover"
      }`}
    >
      {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
  const backToUnlock = (
    <button type="button" disabled={isPending} onClick={() => switchTo("unlock")} className="mt-3 text-sm font-medium text-neutral-500 hover:text-neutral-700">
      {t("Back to unlock")}
    </button>
  );

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-2xl bg-surface p-6 text-center shadow-sm shadow-black/5">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
        {mode === "unlock" ? <Lock className="h-6 w-6" /> : mode === "change" ? <KeyRound className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
      </span>

      {mode === "setup" && (
        <>
          <h2 className="mt-4 text-base font-semibold text-neutral-900">{t("Set up your Vault Password")}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {t("A separate password just for Password Manager, so it stays protected even if your account password ever leaks.")}
          </p>
          <div className="mt-5 space-y-3 text-left">
            {field(t("Account Password"), currentPassword, setCurrentPassword)}
            {field(t("New Vault Password"), vaultPassword, setVaultPassword)}
            {field(t("Confirm Vault Password"), confirmVaultPassword, setConfirmVaultPassword)}
          </div>
          {primaryButton(t("Set Vault Password"), handleSetupOrChange)}
        </>
      )}

      {mode === "change" && (
        <>
          <h2 className="mt-4 text-base font-semibold text-neutral-900">{t("Change your Vault Password")}</h2>
          <p className="mt-1 text-sm text-neutral-500">{t("Your saved passwords stay; only the password that opens them changes.")}</p>
          <div className="mt-5 space-y-3 text-left">
            {field(t("Account Password"), currentPassword, setCurrentPassword)}
            {field(t("Current Vault Password"), currentVaultPassword, setCurrentVaultPassword)}
            {field(t("New Vault Password"), vaultPassword, setVaultPassword)}
            {field(t("Confirm Vault Password"), confirmVaultPassword, setConfirmVaultPassword)}
          </div>
          {primaryButton(t("Change Vault Password"), handleSetupOrChange)}
          {backToUnlock}
        </>
      )}

      {mode === "reset" && (
        <>
          <h2 className="mt-4 text-base font-semibold text-neutral-900">{t("Reset your Vault Password")}</h2>
          <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>{t("Resetting deletes every saved password: they are locked with your vault password, and without it they can't be recovered.")}</p>
          </div>
          <div className="mt-4 space-y-3 text-left">
            {field(t("Account Password"), currentPassword, setCurrentPassword)}
            {field(t("New Vault Password"), vaultPassword, setVaultPassword)}
            {field(t("Confirm Vault Password"), confirmVaultPassword, setConfirmVaultPassword)}
            <label className="flex items-start gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={confirmDeletion} onChange={(e) => setConfirmDeletion(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-danger" />
              {t("I understand that all my saved passwords will be deleted.")}
            </label>
          </div>
          {primaryButton(t("Delete Saved Passwords and Reset"), handleReset, true)}
          {backToUnlock}
        </>
      )}

      {mode === "unlock" && (
        <>
          <h2 className="mt-4 text-base font-semibold text-neutral-900">{t("Enter Vault Password")}</h2>
          <p className="mt-1 text-sm text-neutral-500">{t("For your security, this is required every time you open Password Manager.")}</p>
          <div className="mt-5 text-left">{field(t("Vault Password"), vaultPassword, setVaultPassword)}</div>
          {primaryButton(t("Unlock"), handleUnlock)}
          <div className="mt-3 flex items-center justify-center gap-4">
            <button type="button" onClick={() => switchTo("change")} className="text-sm font-medium text-brand-primary hover:underline">
              {t("Change vault password")}
            </button>
            <button type="button" onClick={() => switchTo("reset")} className="text-sm font-medium text-brand-primary hover:underline">
              {t("Forgot vault password?")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
