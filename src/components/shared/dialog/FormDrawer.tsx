"use client";

import { X } from "lucide-react";
import Button from "@/components/smartly/Button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The design's drawers: 480 for a coupon, 500 for a plan, 520 for an
// announcement, 560 to pay a referral payout, 820 to review one line by
// line.
const WIDTH_CLASSES = {
  sm: "sm:max-w-120!",
  md: "sm:max-w-125!",
  lg: "sm:max-w-130!",
  xl: "sm:max-w-140!",
  "2xl": "sm:max-w-205!",
} as const;

// The same widths as a centred card (the v16 admin boards draw their
// drawers so).
const DIALOG_WIDTH_CLASSES = {
  sm: "sm:max-w-120",
  md: "sm:max-w-125",
  lg: "sm:max-w-130",
  xl: "sm:max-w-140",
  "2xl": "sm:max-w-205",
} as const;

interface FormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  // Under the title, small and muted ("132 people are on this plan").
  description?: React.ReactNode;
  // Beside the close button (a status chip).
  aside?: React.ReactNode;
  trigger?: React.ReactNode;
  width?: keyof typeof WIDTH_CLASSES;
  // A drawer that only shows something (an audit entry) closes on a click
  // outside it; a form keeps what was typed.
  closeOnOutsideClick?: boolean;
  // "dialog": the v16 admin boards' centred card (18px corners, at most the
  // window's height less 48px) instead of the panel from the right; the
  // head, the scrolling body and the pinned foot are the same.
  variant?: "drawer" | "dialog";
  children: React.ReactNode;
}

// A form that slides in from the right, as the design draws plan and coupon
// editing: a titled head with its round close button, the fields, and the
// strip foot pinned to the bottom (give the form FormDialogFooter's
// `pinned`). Its 24px corners come from globals.css. Like FormDialog, a
// stray outside click doesn't throw the form away; Escape still closes.
const FormDrawer = ({ open, onOpenChange, title, description, aside, trigger, width = "md", closeOnOutsideClick = false, variant = "drawer", children }: FormDrawerProps) => {
  const { translate } = useLocale();
  const shownDescription = typeof description === "string" ? translate(description) : description;
  if (variant === "dialog") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent
          showCloseButton={false}
          className={cn("flex max-h-[calc(100vh-48px)] w-full flex-col gap-0 overflow-hidden rounded-[18px] border-0 bg-surface p-0 text-ink shadow-overlay ring-0", DIALOG_WIDTH_CLASSES[width])}
          onInteractOutside={closeOnOutsideClick ? undefined : (event) => event.preventDefault()}
        >
          <DialogHeader className="flex-row items-center justify-between gap-3 border-b border-line px-6 py-4.5 text-left">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <DialogTitle className="text-h3 text-ink">{translate(title)}</DialogTitle>
              <DialogDescription className={description ? "text-small text-ink-muted" : "sr-only"}>{shownDescription ?? translate(title)}</DialogDescription>
            </div>
            {aside && <div className="shrink-0">{aside}</div>}
            <DialogClose asChild>
              <Button variant="ghost" size="icon-xs" aria-label={translate("Close")} className="-my-0.5 -mr-1.5 size-8.5 text-ink-muted">
                <X className="size-4.5" aria-hidden="true" />
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex min-h-full flex-col px-6 py-5">{children}</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn("w-full! gap-0 border-l-0 bg-surface p-0 text-ink shadow-drawer", WIDTH_CLASSES[width])}
        onInteractOutside={closeOnOutsideClick ? undefined : (event) => event.preventDefault()}
      >
        <SheetHeader className="flex-row items-start justify-between gap-3 border-b border-line px-6 py-4.5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <SheetTitle className="text-h3 text-ink">{translate(title)}</SheetTitle>
            <SheetDescription className={description ? "text-small text-ink-muted" : "sr-only"}>{shownDescription ?? translate(title)}</SheetDescription>
          </div>
          {aside && <div className="mt-0.5 shrink-0">{aside}</div>}
          <SheetClose asChild>
            <Button variant="ghost" size="icon-xs" aria-label={translate("Close")} className="-my-0.5 -mr-1.5 size-8.5 text-ink-muted">
              <X className="size-4.5" aria-hidden="true" />
            </Button>
          </SheetClose>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full flex-col px-6 py-5">{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FormDrawer;
