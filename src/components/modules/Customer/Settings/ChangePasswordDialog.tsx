"use client";

import { Check, Circle, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { PasswordField } from "@/components/modules/Customer/Shared/PasswordField";
import { StrengthMeter } from "@/components/modules/Customer/Shared/StrengthMeter";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { changePasswordAction } from "@/lib/customer/authActions";
import { accountPasswordRules } from "@/lib/customer/settingsDisplay";
import { rulesMet } from "@/lib/customer/vaultDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
  // The password changed (and the other devices signed out, if ticked).
  onChanged?: () => void;
  // The other devices signed in, which the change may sign out.
  otherDevices?: number;
}

// A new account password, with the rules ticked off as it is typed
// (design-v4 ChangePasswordDialog).
export function ChangePasswordDialog({ open, onClose, onChanged, otherDevices = 0 }: ChangePasswordDialogProps) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setCurrent("");
      setPassword("");
      setConfirm("");
      setSignOutOthers(true);
    }
  }

  const rules = accountPasswordRules(password, confirm, current, user.name);
  const valid = current.length > 0 && rulesMet(rules);
  const match = rules.find((rule) => rule.key === "match");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const signedOut = otherDevices > 0 && signOutOthers;
      const result = await changePasswordAction({ currentPassword: current, newPassword: password, signOutOthers: otherDevices > 0 ? signOutOthers : true });
      if (result.success) {
        toast.success(t(signedOut ? "Password updated. Your other devices were signed out." : "Password updated."));
        onChanged?.();
        onClose();
      } else {
        toast.error(t(result.message ?? "Failed to update password"));
      }
    });
  }

  const tick = (ok: boolean) => (ok ? <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" /> : <Circle className="size-3.5" aria-hidden="true" />);

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-120 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex max-h-[90vh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4.5">
            <AlertDialogTitle className="text-h3 text-ink">{t("Change password")}</AlertDialogTitle>
            <button type="button" onClick={onClose} disabled={isPending} aria-label={t("Close")} className="-mr-1.5 flex size-8.5 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:size-11">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          <AlertDialogDescription className="sr-only">{t("Your current password, then the new one twice.")}</AlertDialogDescription>
          <div className="flex flex-col gap-3.5 overflow-y-auto px-6 py-5">
            <Field htmlFor="cp-current" label={t("Current password")}>
              <PasswordField id="cp-current" size="md" className="text-body-lg" value={current} onChange={setCurrent} autoComplete="current-password" autoFocus />
            </Field>
            <div className="flex flex-col gap-1.5">
              <Field htmlFor="cp-new" label={t("New password")}>
                <PasswordField id="cp-new" size="md" className="text-body-lg" value={password} onChange={setPassword} autoComplete="new-password" aria-describedby="cp-rules" />
              </Field>
              <StrengthMeter password={password} />
              <ul id="cp-rules" className="mt-0.5 grid gap-x-2.5 gap-y-1.5 sm:grid-cols-2" aria-label={t("Rules")}>
                {rules
                  .filter((rule) => rule.key !== "match")
                  .map((rule) => (
                    <li key={rule.key} className={cn("flex items-center gap-1.5 text-[12.5px]", rule.ok ? "text-income" : "text-ink-muted")}>
                      {tick(rule.ok)}
                      {t(rule.label)}
                    </li>
                  ))}
              </ul>
            </div>
            <Field
              htmlFor="cp-confirm"
              label={t("Type the new password again")}
              hint={
                confirm.length > 0 && match ? (
                  <span className={cn("flex items-center gap-1.5 text-[12.5px]", match.ok ? "text-income" : "text-expense")}>
                    {tick(match.ok)}
                    {t(match.ok ? "Both match" : "They don't match yet")}
                  </span>
                ) : undefined
              }
            >
              <PasswordField id="cp-confirm" size="md" className="text-body-lg" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            </Field>
            {/* Ticked to start with: the API signs the other devices out
                unless this is cleared. */}
            {otherDevices > 0 && (
              <label className="flex cursor-pointer gap-2.5 rounded-[14px] border border-line bg-strip px-3.5 py-3">
                <input type="checkbox" checked={signOutOthers} onChange={(event) => setSignOutOthers(event.target.checked)} disabled={isPending} className="peer sr-only" />
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-px flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border peer-focus-visible:focus-halo",
                    signOutOthers ? "border-emerald bg-emerald text-on-action" : "border-input bg-surface",
                  )}
                >
                  {signOutOthers && <Check className="size-3" strokeWidth={3} />}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-body font-semibold text-ink">
                    {t(otherDevices === 1 ? "Sign out of my other device" : "Sign out of my {count} other devices", { count: formatCount(otherDevices, locale) })}
                  </span>
                  <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t("Do this if you think someone else knows your old password.")}</span>
                </span>
              </label>
            )}
          </div>
          <div className="flex items-center justify-end gap-2.5 border-t border-line bg-strip px-6 py-3.5">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="px-3.5 pointer-coarse:h-11">
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || isPending} className="px-4.5 pointer-coarse:h-11">
              {isPending && <Loader onDark />}
              {t("Update password")}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
