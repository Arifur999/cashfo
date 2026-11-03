"use client";

import { LogOut } from "lucide-react";
import { useId, useRef, useState } from "react";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface SignOutDialogProps {
  open: boolean;
  onClose: () => void;
  // Signs out; true also signs out every other device of the account.
  onSignOut: (everywhere: boolean) => void;
}

// "Sign out?" (AppSidebar board): asked before leaving, with the choice to
// leave every device at once. Signing out leaves the page, so the dialog
// only ever waits and never comes back to ask again. Stay has the focus:
// Enter alone never signs anyone out.
export function SignOutDialog({ open, onClose, onSignOut }: SignOutDialogProps) {
  const { t } = useLocale();
  const [everywhere, setEverywhere] = useState(false);
  const [busy, setBusy] = useState(false);
  const stayRef = useRef<HTMLButtonElement>(null);
  const checkId = useId();

  const close = () => {
    if (busy) return;
    setEverywhere(false);
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && close()}>
      <AlertDialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          stayRef.current?.focus();
        }}
        className="flex w-100 max-w-[calc(100vw-32px)] flex-col items-center gap-3.5 rounded-[20px] border-0 bg-surface px-6 pt-6.5 pb-5.5 text-center shadow-overlay ring-0"
      >
        <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-expense-soft text-expense">
          <LogOut className="size-6" strokeWidth={2} />
        </span>
        <div className="flex flex-col gap-1.5">
          <AlertDialogTitle className="text-lg font-semibold text-ink">{t("Sign out?")}</AlertDialogTitle>
          <AlertDialogDescription className="text-body leading-[1.5] text-ink-soft">{t("You will leave Smartly on this device. Your records stay safe and come back when you sign in.")}</AlertDialogDescription>
        </div>
        <label htmlFor={checkId} className="flex cursor-pointer items-center gap-2.5 self-stretch rounded-xl border border-line px-3 py-2.5 text-left text-[13.5px] text-ink">
          <input id={checkId} type="checkbox" checked={everywhere} onChange={(event) => setEverywhere(event.target.checked)} disabled={busy} className="size-4 shrink-0 accent-emerald" />
          {t("Sign out on all my devices")}
        </label>
        <div className="flex gap-2.5 self-stretch">
          <Button ref={stayRef} variant="secondary" onClick={close} disabled={busy} className="h-10.5 flex-1">
            {t("Stay")}
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            aria-busy={busy || undefined}
            onClick={() => {
              setBusy(true);
              onSignOut(everywhere);
            }}
            className="h-10.5 flex-1"
          >
            {busy && <Loader size={14} onDark label={t("Signing out...")} />}
            {t("Sign out")}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
