"use client";

import { X } from "lucide-react";
import { createElement } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The design-v4 drawer widths: 460 for most forms, 470, 480 and 520 for
// the wider ones, 440 for the narrow Add wallet and Move money drawers.
const WIDTHS = {
  440: "w-110 data-[side=right]:sm:max-w-110",
  460: "w-115 data-[side=right]:sm:max-w-115",
  // The loan drawers (LoanContactDrawer, LoanPrincipalDrawer, LoanProfitDrawer).
  470: "w-117.5 data-[side=right]:sm:max-w-117.5",
  480: "w-120 data-[side=right]:sm:max-w-120",
  520: "w-130 data-[side=right]:sm:max-w-130",
} as const;

interface DrawerProps {
  open: boolean;
  title: string;
  // The line under the title ("Where do you keep this money?").
  description?: React.ReactNode;
  width?: keyof typeof WIDTHS;
  // A tile before the title (the asset's type in Update value).
  icon?: React.ReactNode;
  // Beside the title on its line (a goal's On track chip).
  titleAside?: React.ReactNode;
  // Buttons in the head before the close (a goal's Edit pencil).
  actions?: React.ReactNode;
  // Where focus lands as it opens (Radix's onOpenAutoFocus).
  onOpenAutoFocus?: (event: Event) => void;
  // Closing is refused while a save is in flight.
  busy?: boolean;
  onClose: () => void;
  // Left out, the body is no form (a goal's details, read only).
  onSubmit?: (event: React.FormEvent) => void;
  // The buttons along the bottom: Cancel, then the primary (Button md, the
  // 40px pills).
  footer: React.ReactNode;
  // From md a 560px popup in the middle of the screen instead of the sheet
  // (the loan boards: LoanContactDrawer, LoanPrincipalDrawer,
  // LoanProfitDrawer); a phone keeps the sheet from the bottom.
  popup?: boolean;
  children: React.ReactNode;
}

// The shared drawer frame (design-v4 WalletDrawer and its kin): a sheet from
// the right with 24px corners on the page side (from the bottom on a
// phone), holding a form with the head (18px title, the 13px line under it,
// the round close button), a scrolling body and the foot with its buttons on
// the right, each edged by a line.
export function Drawer({ open, title, description, width = 480, icon, titleAside, actions, onOpenAutoFocus, busy = false, onClose, onSubmit, footer, popup = false, children }: DrawerProps) {
  const { t } = useLocale();
  const wide = useMediaQuery("(min-width: 768px)");
  const closeButton = (
    <button type="button" onClick={onClose} disabled={busy} aria-label={t("Close")} className="-my-1 -mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:size-11">
      <X className="size-4.5" aria-hidden="true" />
    </button>
  );
  const body = (padding: string) =>
    createElement(
      onSubmit ? "form" : "div",
      { onSubmit, className: "flex min-h-0 flex-1 flex-col" },
      <div className={cn("flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto", padding)}>{children}</div>,
      footer && <div className={cn("flex items-center justify-end gap-2.5 border-t border-line bg-surface", wide ? "px-6 py-3.5" : "px-4 py-3")}>{footer}</div>,
    );

  if (popup && wide) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
        <DialogContent showCloseButton={false} onOpenAutoFocus={onOpenAutoFocus} className="flex max-h-[calc(100dvh-48px)] w-140 flex-col gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 text-ink shadow-overlay ring-0 sm:max-w-none">
          <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
            {icon}
            <div className={cn("flex min-w-0 flex-col gap-1", (icon || titleAside || actions) && "mr-auto")}>
              <div className="flex min-w-0 items-center gap-2.5">
                <DialogTitle className="truncate text-h3 text-ink">{title}</DialogTitle>
                {titleAside}
              </div>
              <DialogDescription className={description ? "text-small text-ink-muted" : "sr-only"}>{description ?? title}</DialogDescription>
            </div>
            {actions}
            {closeButton}
          </div>
          {body("p-6")}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} onOpenAutoFocus={onOpenAutoFocus} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? cn(WIDTHS[width], "shadow-drawer") : "rounded-t-xl data-[side=bottom]:h-[92vh]")}>
        <SheetHeader className={cn("flex-row items-start justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          {icon}
          <div className={cn("flex min-w-0 flex-col gap-1", (icon || titleAside || actions) && "mr-auto")}>
            {titleAside ? (
              <div className="flex min-w-0 items-center gap-2.5">
                <SheetTitle className="truncate text-h3 text-ink">{title}</SheetTitle>
                {titleAside}
              </div>
            ) : (
              <SheetTitle className="text-h3 text-ink">{title}</SheetTitle>
            )}
            <SheetDescription className={description ? "text-small text-ink-muted" : "sr-only"}>{description ?? title}</SheetDescription>
          </div>
          {/* Like Escape and a click outside, refused mid-save: closing then
              would lose what is being saved (a photo half uploaded). */}
          {actions}
          {closeButton}
        </SheetHeader>
        {body(wide ? "p-6" : "px-4 py-3")}
      </SheetContent>
    </Sheet>
  );
}
