"use client";

import { X } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface GroupDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  // The line under the title.
  sub?: React.ReactNode;
  // A tile before the title (a category's preview).
  lead?: React.ReactNode;
  // The boards' widths: 420 (rename) up to 820 (New group).
  width?: 420 | 440 | 460 | 480 | 500 | 520 | 540 | 560 | 580 | 620 | 820;
  // The bottom bar's buttons, right-aligned.
  footer: React.ReactNode;
  children: React.ReactNode;
  // While a save runs the dialog can't be closed.
  busy?: boolean;
  onSubmit?: (event: React.FormEvent) => void;
  className?: string;
  bodyClassName?: string;
}

const WIDTHS = {
  420: "w-[420px]",
  440: "w-[440px]",
  460: "w-[460px]",
  480: "w-[480px]",
  500: "w-[500px]",
  520: "w-[520px]",
  540: "w-[540px]",
  560: "w-[560px]",
  580: "w-[580px]",
  620: "w-[620px]",
  820: "w-[820px]",
} as const;

// The v16 boards' centered popup: a head with the title and a round X, the
// form, and a grey strip with the buttons. Every group form uses it.
export function GroupDialog({ open, onClose, title, sub, lead, width = 460, footer, children, busy = false, onSubmit, className, bodyClassName }: GroupDialogProps) {
  const { t } = useLocale();
  const body = (
    <>
      <div className="flex items-center gap-3 border-b border-divider pt-4 pr-5 pb-3.5 pl-6">
        {lead}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <AlertDialogTitle className="text-[18px] leading-snug font-bold tracking-normal text-ink">{title}</AlertDialogTitle>
          {sub ? <AlertDialogDescription className="text-[12.5px] text-ink-muted">{sub}</AlertDialogDescription> : <AlertDialogDescription className="sr-only">{title}</AlertDialogDescription>}
        </div>
        <button type="button" onClick={onClose} disabled={busy} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-soft hover:bg-line disabled:pointer-events-none disabled:opacity-50 pointer-coarse:size-11">
          <X className="size-4.25" strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>
      <div className={cn("flex max-h-[min(70vh,640px)] flex-col gap-4 overflow-y-auto px-6 py-4.5", bodyClassName)}>{children}</div>
      <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-divider bg-strip px-6 py-3.5">{footer}</div>
    </>
  );
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <AlertDialogContent className={cn(WIDTHS[width], "max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 shadow-overlay ring-0", className)}>
        {onSubmit ? (
          <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-col">
            {body}
          </form>
        ) : (
          <div className="flex min-h-0 flex-col">{body}</div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
