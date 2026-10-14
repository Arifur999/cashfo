"use client";

import { Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { logoutAction } from "@/app/-actions/authActions";
import { resetBusinessPinAction, verifyBusinessPinAction } from "@/lib/customer/businessActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface WorkspaceLockScreenProps {
  businessId: string;
  businessName: string;
  // Only the owner can remove a forgotten PIN.
  isOwner: boolean;
  // Where to go once it opens; without one, the current page reloads.
  next?: string;
}

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

// What a PIN-locked workspace shows until its PIN is entered on this
// device: the customer layout renders it in place of the app, and
// /unlock-workspace when a page finds the workspace locked.
export function WorkspaceLockScreen({ businessId, businessName, isOwner, next }: WorkspaceLockScreenProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [mode, setMode] = useState<"pin" | "forgot">("pin");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function opened() {
    if (next) {
      router.replace(next);
    } else {
      router.refresh();
    }
  }

  function submitPin(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await verifyBusinessPinAction(businessId, pin);
      if (!result.success) {
        setError(result.message ?? t("Failed to verify PIN"));
        return;
      }
      if (result.data?.valid) {
        opened();
      } else {
        setError(t("Incorrect PIN, try again."));
        setPin("");
      }
    });
  }

  function submitReset(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await resetBusinessPinAction(businessId, password);
      if (!result.success) {
        setError(result.message ?? t("Failed to remove the PIN"));
        return;
      }
      opened();
    });
  }

  function switchMode(to: "pin" | "forgot") {
    setMode(to);
    setError(null);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-content px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-sm shadow-black/5">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
            <Lock className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-3 text-lg font-semibold text-neutral-900">{businessName}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {mode === "pin" ? t("This workspace is locked. Enter its PIN to open it.") : t("Enter your account password to remove the PIN.")}
          </p>
        </div>

        {mode === "pin" ? (
          <form onSubmit={submitPin} className="mt-5 space-y-3">
            <label htmlFor="workspace-pin" className="sr-only">
              {t("PIN")}
            </label>
            <input
              id="workspace-pin"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/[^0-9]/g, ""));
                setError(null);
              }}
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              autoFocus
              placeholder="••••"
              className={`${inputClass} text-center tracking-[0.5em]`}
            />
            {error && <p className="text-sm text-brand-danger">{error}</p>}
            <button
              type="submit"
              disabled={pin.length < 4 || isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Unlock")}
            </button>
          </form>
        ) : (
          <form onSubmit={submitReset} className="mt-5 space-y-3">
            <label htmlFor="account-password" className="sr-only">
              {t("Account password")}
            </label>
            <input
              id="account-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              autoComplete="current-password"
              autoFocus
              placeholder={t("Account password")}
              className={inputClass}
            />
            {error && <p className="text-sm text-brand-danger">{error}</p>}
            <button
              type="submit"
              disabled={!password || isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Remove PIN")}
            </button>
          </form>
        )}

        <div className="mt-4 flex items-center justify-between text-sm">
          {isOwner ? (
            <button type="button" onClick={() => switchMode(mode === "pin" ? "forgot" : "pin")} className="font-medium text-brand-primary hover:underline">
              {mode === "pin" ? t("Forgot PIN?") : t("Enter PIN instead")}
            </button>
          ) : (
            <span className="text-neutral-400">{t("Ask the workspace owner for the PIN.")}</span>
          )}
          <button type="button" onClick={() => startTransition(() => logoutAction())} className="text-neutral-500 hover:text-neutral-700">
            {t("Log out")}
          </button>
        </div>
      </div>
    </div>
  );
}
