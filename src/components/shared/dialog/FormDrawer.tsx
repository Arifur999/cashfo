"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The design's drawers: 480 for a coupon, 500 for a plan, 520 for an
// announcement.
const WIDTH_CLASSES = {
  sm: "sm:max-w-120!",
  md: "sm:max-w-125!",
  lg: "sm:max-w-130!",
} as const;

interface FormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  // Under the title, small and muted ("132 people are on this plan").
  description?: React.ReactNode;
  trigger?: React.ReactNode;
  width?: keyof typeof WIDTH_CLASSES;
  // A drawer that only shows something (an audit entry) closes on a click
  // outside it; a form keeps what was typed.
  closeOnOutsideClick?: boolean;
  children: React.ReactNode;
}

// A form that slides in from the right, as the design draws plan and coupon
// editing: a titled head, the fields, and the cream foot pinned to the
// bottom (give the form FormDialogFooter's `pinned`). Like FormDialog, a
// stray outside click doesn't throw the form away; Escape still closes.
const FormDrawer = ({ open, onOpenChange, title, description, trigger, width = "md", closeOnOutsideClick = false, children }: FormDrawerProps) => {
  const { translate } = useLocale();
  const shownDescription = typeof description === "string" ? translate(description) : description;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent
        side="right"
        className={cn("w-full! gap-0 border-l-0 bg-surface p-0 text-ink shadow-overlay", WIDTH_CLASSES[width])}
        onInteractOutside={closeOnOutsideClick ? undefined : (event) => event.preventDefault()}
      >
        <SheetHeader className="gap-0.5 border-b border-line px-6 py-5 pr-14">
          <SheetTitle className="text-h3 text-ink">{translate(title)}</SheetTitle>
          <SheetDescription className={description ? "text-small text-ink-muted" : "sr-only"}>{shownDescription ?? translate(title)}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full flex-col px-6 py-5">{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FormDrawer;
