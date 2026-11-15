"use client";

import { X } from "lucide-react";
import Button from "@/components/smartly/Button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { focusFirstField } from "./focusFirstField";

// The design's dialogs: 480 (change password), 520 (refund, reset), and a
// wide one for long forms.
const SIZE_CLASSES = {
  sm: "sm:max-w-120",
  md: "sm:max-w-130",
  lg: "sm:max-w-2xl",
} as const;

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  // Optional trigger for self-contained "Create X" dialogs.
  trigger?: React.ReactNode;
  size?: keyof typeof SIZE_CLASSES;
  // A dialog that only shows something (who used a coupon) closes on a click
  // outside it, as FormDrawer's can; a form keeps what was typed.
  closeOnOutsideClick?: boolean;
  // Another width than the three sizes (the saved replies' 560px card).
  className?: string;
  children: React.ReactNode;
}

// The shell every create/edit dialog shares: header, scrollable body, and a
// guard so a half-filled form doesn't vanish on a stray outside click
// (Escape still closes it, for keyboard users).
const FormDialog = ({ open, onOpenChange, title, description, trigger, size = "md", closeOnOutsideClick = false, className, children }: FormDialogProps) => {
  const { translate } = useLocale();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        showCloseButton={false}
        className={cn("max-h-[90vh] gap-0 overflow-hidden rounded-[20px] border-line bg-surface p-0 shadow-overlay ring-0", SIZE_CLASSES[size], className)}
        onInteractOutside={closeOnOutsideClick ? undefined : (event) => event.preventDefault()}
        onOpenAutoFocus={focusFirstField}
      >
        {/* The design's dialog head: 18px title, the explanation under it,
            the round close button on the right. */}
        <DialogHeader className="flex-row items-center justify-between gap-3 border-b border-line px-6 py-4.5 text-left">
          <div className="flex min-w-0 flex-col gap-0.5">
            <DialogTitle className="text-h3 text-ink">{translate(title)}</DialogTitle>
            {description && <DialogDescription className="text-small leading-normal text-ink-muted">{typeof description === "string" ? translate(description) : description}</DialogDescription>}
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon-xs" aria-label={translate("Close")} className="-mr-1.5 size-8.5 shrink-0 text-ink-muted">
              <X className="size-4.5" aria-hidden="true" />
            </Button>
          </DialogClose>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-5.5rem)]">
          <div className="px-6 py-4.5">{children}</div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default FormDialog;
