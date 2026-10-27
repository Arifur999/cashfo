"use client";

import { X } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  // Under the title; for screen readers only when `hideDescription`.
  description?: React.ReactNode;
  hideDescription?: boolean;
  // While a call is out the dialog can't be closed.
  busy?: boolean;
  // The strip across the bottom (Cancel and the action, right-aligned).
  footer?: React.ReactNode;
  // 480 (ChangePasswordDialog) or 520.
  width?: "sm" | "md";
  onSubmit?: (event: React.FormEvent) => void;
  children: React.ReactNode;
}

// The frame of Settings' dialogs, as ChangePasswordDialog draws it: the
// 18px title and the round close button over a line, the body 24px in,
// the grey foot with the buttons on the right. A click outside doesn't
// close it (a half-typed code stays); Esc and the cross do.
export function SettingsDialog({ open, onClose, title, description, hideDescription = false, busy = false, footer, width = "sm", onSubmit, children }: SettingsDialogProps) {
  const { t } = useLocale();
  const Body = onSubmit ? "form" : "div";
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <AlertDialogContent className={cn("max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 shadow-overlay ring-0", width === "sm" ? "w-120" : "w-130")}>
        <Body {...(onSubmit && { onSubmit, noValidate: true })} className="flex max-h-[90vh] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4.5">
            <div className="flex min-w-0 flex-col gap-1">
              <AlertDialogTitle className="text-h3 text-ink">{title}</AlertDialogTitle>
              {description && <AlertDialogDescription className={cn("text-small leading-normal text-ink-muted", hideDescription && "sr-only")}>{description}</AlertDialogDescription>}
            </div>
            <button type="button" onClick={onClose} disabled={busy} aria-label={t("Close")} className="-mr-1.5 flex size-8.5 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:size-11">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          {!description && <AlertDialogDescription className="sr-only">{title}</AlertDialogDescription>}
          <div className="flex flex-col gap-3.5 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line bg-strip px-6 py-3.5">{footer}</div>}
        </Body>
      </AlertDialogContent>
    </AlertDialog>
  );
}
