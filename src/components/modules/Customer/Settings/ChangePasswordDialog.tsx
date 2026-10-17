"use client";

import { Check, Circle, Info, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PasswordField } from "@/components/modules/Customer/Shared/PasswordField";
import { StrengthMeter } from "@/components/modules/Customer/Shared/StrengthMeter";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { changePasswordAction } from "@/lib/customer/authActions";
import { accountPasswordRules } from "@/lib/customer/settingsDisplay";
import { rulesMet } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

// A new account password, with the rules ticked off as it is typed.
export function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const { t } = useLocale();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setCurrent("");
      setPassword("");
      setConfirm("");
    }
  }

  const rules = accountPasswordRules(password, confirm, current);
  const valid = current.length > 0 && rulesMet(rules);
  const match = rules[3];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const result = await changePasswordAction({ currentPassword: current, newPassword: password });
      if (result.success) {
        toast.success(t("Password updated. Your other devices were signed out."));
        onClose();
      } else {
        toast.error(result.message ?? t("Failed to update password"));
      }
    });
  }

  const label = (text: string) => <span className="text-body font-medium text-ink">{text}</span>;

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-120 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
            <AlertDialogTitle className="text-h3 text-ink">{t("Change password")}</AlertDialogTitle>
            <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          <AlertDialogDescription className="sr-only">{t("Your current password, then the new one twice.")}</AlertDialogDescription>
          <div className="flex flex-col gap-4 px-6 py-5">
            <Field htmlFor="cp-current" label={label(t("Current password"))}>
              <PasswordField id="cp-current" size="md" value={current} onChange={setCurrent} autoComplete="current-password" autoFocus />
            </Field>
            <Field htmlFor="cp-new" label={label(t("New password"))}>
              <PasswordField id="cp-new" size="md" value={password} onChange={setPassword} autoComplete="new-password" />
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
            <Field htmlFor="cp-confirm" label={label(t("Type the new password again"))} hint={confirm.length > 0 ? <span className={cn("flex items-center gap-2", match.ok ? "text-income" : "text-expense")}>{match.ok ? <Check className="size-4" strokeWidth={2.5} aria-hidden="true" /> : <Circle className="size-4" aria-hidden="true" />}{t(match.ok ? "Both match" : "They don't match yet")}</span> : undefined}>
              <PasswordField id="cp-confirm" size="md" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            </Field>
            <div className="flex items-start gap-3 rounded-md border border-line bg-cream px-4 py-3 text-small leading-normal text-ink-2">
              <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <span>{t("Your other devices are signed out when the password changes, so anyone who knew the old one is out.")}</span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-line bg-cream px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader />}
              {t("Update password")}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
