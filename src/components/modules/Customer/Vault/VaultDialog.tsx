"use client";

import { X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const WIDTHS = { 440: "w-110", 540: "w-135", 580: "w-145" } as const;

interface VaultDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  // The line (or chips) under the title.
  sub?: React.ReactNode;
  // Before the title: the login's letter.
  lead?: React.ReactNode;
  // Round buttons before the close button (the star).
  actions?: React.ReactNode;
  width?: keyof typeof WIDTHS;
  // A line under the head (the Add login popup), or none (a login's details).
  headLine?: boolean;
  // The grey strip at the bottom.
  footer?: React.ReactNode;
  children?: React.ReactNode;
  bodyClassName?: string;
  // A save is on its way: the popup can't be closed.
  busy?: boolean;
  onSubmit?: (event: React.FormEvent) => void;
  // Where focus goes as it opens (the Name box), instead of the first button.
  onOpenAutoFocus?: (event: Event) => void;
}

// The vault boards' centred popup (a login's details, Add or edit login):
// a head with the letter, the title and round buttons, the body that
// scrolls, and a grey strip with the buttons. On a phone it fills the
// width less a 16px margin.
export function VaultDialog({ open, onClose, title, sub, lead, actions, width = 540, headLine = false, footer, children, bodyClassName, busy = false, onSubmit, onOpenAutoFocus }: VaultDialogProps) {
  const { t } = useLocale();
  const inner = (
    <>
      <div className={cn("flex shrink-0 items-center gap-3 sm:gap-3.5", headLine ? "border-b border-line px-4 py-3.5 sm:px-6 sm:py-4.5" : "px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4")}>
        {lead}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <DialogTitle className={cn("min-w-0 truncate text-[17px] leading-[normal] font-semibold text-ink", headLine ? "sm:text-[18px]" : "sm:text-[19px]")}>{title}</DialogTitle>
          {sub ? (
            <DialogDescription asChild>
              <div className="text-[12.5px] leading-[normal] text-ink-muted">{sub}</div>
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{typeof title === "string" ? title : ""}</DialogDescription>
          )}
        </div>
        {actions}
        <button type="button" onClick={onClose} disabled={busy} aria-label={t("Close")} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-page text-ink-soft hover:bg-surface-sunken hover:text-ink disabled:opacity-50 pointer-coarse:size-11 max-sm:bg-transparent max-sm:text-ink-muted">
          <X className="size-4.5" aria-hidden="true" />
        </button>
      </div>
      <div className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", bodyClassName)}>{children}</div>
      {footer && <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-t border-line bg-strip px-4 py-3.5 sm:px-5">{footer}</div>}
    </>
  );
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={onOpenAutoFocus}
        className={cn(WIDTHS[width], "flex max-h-[calc(100dvh-32px)] max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 sm:rounded-[22px] text-ink shadow-overlay ring-0 sm:max-w-[calc(100vw-32px)]")}
      >
        {onSubmit ? (
          <form noValidate onSubmit={onSubmit} autoComplete="off" className="flex min-h-0 flex-1 flex-col">
            {inner}
          </form>
        ) : (
          inner
        )}
      </DialogContent>
    </Dialog>
  );
}
