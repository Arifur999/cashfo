"use client";

import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { CloseX } from "./GroupBits";

interface GroupDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  // The line under the title.
  sub?: React.ReactNode;
  // A tile before the title (a category's preview).
  lead?: React.ReactNode;
  // Width: 420 (rename), 460 (most forms), 520, 620 (New group).
  width?: 420 | 460 | 520 | 620 | 820;
  // The bottom bar's buttons, right-aligned.
  footer: React.ReactNode;
  children: React.ReactNode;
  // While a save runs the dialog can't be closed.
  busy?: boolean;
  onSubmit?: (event: React.FormEvent) => void;
  className?: string;
  // The head drawn as a coloured band (the v16 member popup) instead of a ruled strip.
  hero?: boolean;
}

const WIDTHS = { 420: "w-105", 460: "w-115", 520: "w-130", 620: "w-155", 820: "w-205" } as const;

// The v7 boards' centered dialog: a head with the title and X, the form,
// and a strip with the buttons. Every group form uses it.
export function GroupDialog({ open, onClose, title, sub, lead, width = 460, footer, children, busy = false, onSubmit, className, hero = false }: GroupDialogProps) {
  const body = (
    <>
      <div className={cn("flex items-start gap-3 px-6 py-5", hero ? "items-center gap-3.5 bg-linear-135 from-mint-50 to-mint-200 pt-5.5 pr-5.5 pb-5" : "border-b border-line")}>
        {lead}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <AlertDialogTitle className={cn("text-h3 text-ink", hero && "text-[19px] font-bold tracking-[-0.01em]")}>{title}</AlertDialogTitle>
          {sub ? <AlertDialogDescription className="text-small text-ink-muted">{sub}</AlertDialogDescription> : <AlertDialogDescription className="sr-only">{title}</AlertDialogDescription>}
        </div>
        <CloseX onClick={onClose} disabled={busy} className="-mt-1 -mr-2" />
      </div>
      <div className="flex max-h-[min(70vh,640px)] flex-col gap-4 overflow-y-auto px-6 py-5">{children}</div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-strip px-6 py-4">{footer}</div>
    </>
  );
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <AlertDialogContent className={cn(WIDTHS[width], "max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0", className)}>
        {onSubmit ? (
          <form onSubmit={onSubmit} noValidate className="flex flex-col">
            {body}
          </form>
        ) : (
          <div className="flex flex-col">{body}</div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
