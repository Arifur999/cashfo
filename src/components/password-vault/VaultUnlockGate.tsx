"use client";

import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getVaultStatusAction, setVaultPasswordAction, unlockVaultAction } from "@/lib/passwordVaultActions";

interface VaultUnlockGateProps {
  onUnlocked: (vaultToken: string) => void;
}

// Gates the whole Password Manager page -- shown every time the page loads
// (the unlocked vaultToken lives only in PasswordVaultPageClient's React
// state, never a cookie, so navigating away and back always re-locks). First
// visit ever shows the "set up" form (requires the account password once, to
// prove it's really the account owner); every visit after that shows the
// plain "unlock" form.
export function VaultUnlockGate({ onUnlocked }: VaultUnlockGateProps) {
  const { t } = useLocale();
  // "reset" renders the exact same form as "setup" (Account Password + New
  // Vault Password + Confirm) and calls the same setVaultPasswordAction --
  // the backend's setVaultPassword() already re-verifies the ACCOUNT
  // password rather than the old vault password, so it doubles as a
  // "forgot vault password" recovery with zero backend changes needed (see
  // that method's own comment). Kept as a separate mode only so the
  // heading/subtext can honestly say "reset" instead of "set up" when
  // reached via the "Forgot vault password?" link.
  const [mode, setMode] = useState<"loading" | "setup" | "unlock" | "reset">("loading");

  const [currentPassword, setCurrentPassword] = useState("");
  const [vaultPassword, setVaultPassword] = useState("");
  const [confirmVaultPassword, setConfirmVaultPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getVaultStatusAction().then((result) => {
      setMode(result.success && result.data?.hasVaultPassword ? "unlock" : "setup");
    });
  }, []);

  // Shared by both "setup" (first-time) and "reset" (forgot vault password)
  // -- setVaultPasswordAction always re-verifies the ACCOUNT password, never
  // the old vault password, so recovering from a forgotten vault password
  // needs no separate backend support: it's the exact same call.
  function handleSetup() {
    if (!currentPassword) {
      toast.error(t("Enter your account password"));
      return;
    }
    if (vaultPassword.length < 6) {
      toast.error(t("Vault password must be at least 6 characters"));
      return;
    }
    if (vaultPassword !== confirmVaultPassword) {
      toast.error(t("Vault passwords don't match"));
      return;
    }
    const isReset = mode === "reset";
    startTransition(async () => {
      const result = await setVaultPasswordAction({ currentPassword, vaultPassword });
      if (result.success) {
        toast.success(isReset ? t("Vault password reset -- unlock below to continue") : t("Vault password set -- unlock below to continue"));
        setCurrentPassword("");
        setVaultPassword("");
        setConfirmVaultPassword("");
        setMode("unlock");
      } else {
        toast.error(result.message ?? t("Failed to set vault password"));
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

  // Switching into "reset" clears any stale unlock-attempt input rather
  // than carrying over a wrong vault password guess into the new form's
  // (unrelated) vault-password field.
  function startReset() {
    setVaultPassword("");
    setMode("reset");
  }

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-2xl bg-surface p-6 text-center shadow-sm shadow-black/5">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
        {mode === "unlock" ? <Lock className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
      </span>

      {mode === "setup" || mode === "reset" ? (
        <>
          <h2 className="mt-4 text-base font-semibold text-neutral-900">
            {mode === "reset" ? t("Reset your Vault Password") : t("Set up your Vault Password")}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {mode === "reset"
              ? t("Confirm your account password to set a new vault password.")
              : t("A separate password just for Password Manager, so it stays protected even if your account password ever leaks.")}
          </p>
          <div className="mt-5 space-y-3 text-left">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Account Password")}</label>
              <PasswordInput value={currentPassword} onChange={setCurrentPassword} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">{t("New Vault Password")}</label>
              <PasswordInput value={vaultPassword} onChange={setVaultPassword} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Confirm Vault Password")}</label>
              <PasswordInput value={confirmVaultPassword} onChange={setConfirmVaultPassword} />
            </div>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleSetup}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "reset" ? t("Reset Vault Password") : t("Set Vault Password")}
          </button>
          {mode === "reset" && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setCurrentPassword("");
                setVaultPassword("");
                setConfirmVaultPassword("");
                setMode("unlock");
              }}
              className="mt-3 text-sm font-medium text-neutral-500 hover:text-neutral-700"
            >
              {t("Back to unlock")}
            </button>
          )}
        </>
      ) : (
        <>
          <h2 className="mt-4 text-base font-semibold text-neutral-900">{t("Enter Vault Password")}</h2>
          <p className="mt-1 text-sm text-neutral-500">{t("For your security, this is required every time you open Password Manager.")}</p>
          <div className="mt-5 text-left">
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Vault Password")}</label>
            <PasswordInput value={vaultPassword} onChange={setVaultPassword} />
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleUnlock}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Unlock")}
          </button>
          <button type="button" onClick={startReset} className="mt-3 text-sm font-medium text-brand-primary hover:underline">
            {t("Forgot vault password?")}
          </button>
        </>
      )}
    </div>
  );
}
