"use client";

import { X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const WIDTHS = { 420: "w-105", 440: "w-110", 460: "w-115", 480: "w-120", 500: "w-125", 520: "w-130", 540: "w-135", 560: "w-140", 580: "w-145", 600: "w-150", 620: "w-155", 940: "w-235" } as const;

interface PopupDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  // The line under the title.
  sub?: React.ReactNode;
  // Before the title (a goal's ring).
  lead?: React.ReactNode;
  // Beside the title (a status chip).
  aside?: React.ReactNode;
  // Icon buttons before the close button (Edit goal).
  actions?: React.ReactNode;
  width?: keyof typeof WIDTHS;
  // The bottom strip; right-aligned unless it lays itself out.
  footer?: React.ReactNode;
  footerClassName?: string;
  children?: React.ReactNode;
  bodyClassName?: string;
  // The head row and its title, for a board that draws them its own way.
  headClassName?: string;
  // Where focus starts (the dialog's first field by default).
  onOpenAutoFocus?: (event: Event) => void;
  titleClassName?: string;
  // The line under the title (a board that sets its own line height).
  subClassName?: string;
  // The X, for a board that draws it filled (Balance).
  closeClassName?: string;
  // A save is on its way: the popup can't be closed.
  busy?: boolean;
  onSubmit?: (event: React.FormEvent) => void;
  // A plain message (Delete): no head line or strip, just the text and buttons.
  plain?: boolean;
  className?: string;
}

// The boards' centred popup (Savings first, then Zakat and Balance): a head
// with the title and X over a line, the body, and a grey strip with the
// buttons. On a phone it fills the width less a margin and scrolls.
export function PopupDialog({ open, onClose, title, sub, lead, aside, actions, width = 560, footer, footerClassName, children, bodyClassName, headClassName, titleClassName, subClassName, closeClassName, onOpenAutoFocus, busy = false, onSubmit, plain = false, className }: PopupDialogProps) {
  const { t } = useLocale();
  const close = (
    <button type="button" onClick={onClose} disabled={busy} aria-label={t("Close")} className={cn("-my-1 flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken disabled:opacity-50 pointer-coarse:size-11", closeClassName)}>
      <X className="size-4.5" aria-hidden="true" />
    </button>
  );
  const inner = plain ? (
    <div className={cn("flex flex-col gap-3 px-6 py-5.5", bodyClassName)}>
      <DialogTitle className={cn("text-h3 font-bold text-ink", titleClassName)}>{title}</DialogTitle>
      {/* The classes go on the Description itself, so tailwind-merge drops its own text-sm and muted colour. */}
      <DialogDescription asChild className="text-body leading-[1.55] text-ink-soft">
        <div>{sub}</div>
      </DialogDescription>
      {children}
      {footer && <div className={cn("mt-1.5 flex flex-wrap justify-end gap-2.5", footerClassName)}>{footer}</div>}
    </div>
  ) : (
    <>
      <div className={cn("flex shrink-0 items-start gap-3 border-b border-line px-6 py-4", headClassName)}>
        {lead}
        <div className="flex min-w-0 flex-1 flex-col gap-1 self-center">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <DialogTitle className={cn("min-w-0 text-[18px] font-semibold wrap-break-word text-ink", titleClassName, "leading-[1.3]")}>{title}</DialogTitle>
            {aside}
          </div>
          {sub ? (
            <DialogDescription asChild className={cn("text-small leading-normal text-ink-muted", subClassName)}>
              <div>{sub}</div>
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{typeof title === "string" ? title : ""}</DialogDescription>
          )}
        </div>
        {actions}
        {close}
      </div>
      <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4.5", bodyClassName)}>{children}</div>
      {footer && <div className={cn("flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-line bg-strip px-6 py-3.5", footerClassName)}>{footer}</div>}
    </>
  );
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={onOpenAutoFocus}
        className={cn(WIDTHS[width], "flex max-h-[calc(100dvh-32px)] max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 text-ink shadow-overlay ring-0 sm:max-w-[calc(100vw-32px)]", className)}
      >
        {onSubmit ? (
          <form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            {inner}
          </form>
        ) : (
          inner
        )}
      </DialogContent>
    </Dialog>
  );
}
