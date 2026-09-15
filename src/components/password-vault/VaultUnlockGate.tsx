"use client";

import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/ui/PasswordInput";
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
  const [mode, setMode] = useState<"loading" | "setup" | "unlock">("loading");

  const [currentPassword, setCurrentPassword] = useState("");
  const [vaultPassword, setVaultPassword] = useState("");
  const [confirmVaultPassword, setConfirmVaultPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getVaultStatusAction().then((result) => {
      setMode(result.success && result.data?.hasVaultPassword ? "unlock" : "setup");
    });
  }, []);

  function handleSetup() {
    if (!currentPassword) {
      toast.error("Enter your account password");
      return;
    }
    if (vaultPassword.length < 6) {
      toast.error("Vault password must be at least 6 characters");
      return;
    }
    if (vaultPassword !== confirmVaultPassword) {
      toast.error("Vault passwords don't match");
      return;
    }
    startTransition(async () => {
      const result = await setVaultPasswordAction({ currentPassword, vaultPassword });
      if (result.success) {
        toast.success("Vault password set -- unlock below to continue");
        setCurrentPassword("");
        setVaultPassword("");
        setConfirmVaultPassword("");
        setMode("unlock");
      } else {
        toast.error(result.message ?? "Failed to set vault password");
      }
    });
  }

  function handleUnlock() {
    if (!vaultPassword) {
      toast.error("Enter your vault password");
      return;
    }
    startTransition(async () => {
      const result = await unlockVaultAction(vaultPassword);
      if (result.success && result.data) {
        setVaultPassword("");
        onUnlocked(result.data.vaultToken);
      } else {
        toast.error(result.message ?? "Incorrect vault password");
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

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-2xl bg-surface p-6 text-center shadow-sm shadow-black/5">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
        {mode === "setup" ? <ShieldCheck className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
      </span>

      {mode === "setup" ? (
        <>
          <h2 className="mt-4 text-base font-semibold text-neutral-900">Set up your Vault Password</h2>
          <p className="mt-1 text-sm text-neutral-500">
            A separate password just for Password Manager, so it stays protected even if your account password ever leaks.
          </p>
          <div className="mt-5 space-y-3 text-left">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Account Password</label>
              <PasswordInput value={currentPassword} onChange={setCurrentPassword} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">New Vault Password</label>
              <PasswordInput value={vaultPassword} onChange={setVaultPassword} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Confirm Vault Password</label>
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
            Set Vault Password
          </button>
        </>
      ) : (
        <>
          <h2 className="mt-4 text-base font-semibold text-neutral-900">Enter Vault Password</h2>
          <p className="mt-1 text-sm text-neutral-500">For your security, this is required every time you open Password Manager.</p>
          <div className="mt-5 text-left">
            <label className="mb-1 block text-sm font-medium text-neutral-700">Vault Password</label>
            <PasswordInput value={vaultPassword} onChange={setVaultPassword} />
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleUnlock}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Unlock
          </button>
        </>
      )}
    </div>
  );
}
