"use client";

import { AlertTriangle, Check, Info, type LucideIcon } from "lucide-react";
import { useId, useState } from "react";
import Loader from "@/components/shared/Loader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Input from "@/components/smartly/form/Input";
import { Label } from "@/components/ui/label";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  onConfirm: () => void;
  confirmLabel?: string;
  confirmIcon?: LucideIcon;
  pendingLabel?: string;
  variant?: "default" | "destructive";
  // The icon in the circle beside the title; a warning sign for a
  // destructive dialog, an "i" otherwise.
  icon?: LucideIcon;
  isPending?: boolean;
  confirmDisabled?: boolean;
  // For irreversible actions: the admin must type this exact text (e.g. the
  // owner's email) before the confirm button enables.
  confirmationText?: string;
  // "Type their email to confirm:" -- defaults to "Type {text} to confirm",
  // naming the text.
  confirmationLabel?: React.ReactNode;
  // Shown in green once the typed text matches ("Matches their email").
  confirmationMatchedText?: string;
  // Extra content between the description and the buttons.
  children?: React.ReactNode;
  // A button at the left of the foot (Reset data's "Download a copy").
  footerStart?: React.ReactNode;
  // 520px instead of 500, for a foot with three buttons (AdminOwnerResetDialog).
  wide?: boolean;
}

type ConfirmBodyProps = Omit<ConfirmDialogProps, "open" | "onOpenChange" | "title" | "description" | "icon" | "wide">;

// The 40px pills of the design's dialog foot.
const BUTTON = "h-10 rounded-full px-4 text-body font-semibold";

// Rendered inside AlertDialogContent, which unmounts on close -- so the typed
// confirmation starts empty on every open.
const ConfirmBody = ({
  onConfirm,
  confirmLabel = "Confirm",
  confirmIcon: ConfirmIcon,
  pendingLabel = "Working...",
  variant = "default",
  isPending = false,
  confirmDisabled = false,
  confirmationText,
  confirmationLabel,
  confirmationMatchedText,
  children,
  footerStart,
}: ConfirmBodyProps) => {
  const { translate } = useLocale();
  const inputId = useId();
  const [typed, setTyped] = useState("");
  const matches = Boolean(confirmationText) && typed.trim() === confirmationText;
  const isConfirmationMet = !confirmationText || matches;
  const destructive = variant === "destructive";

  return (
    <>
      {(children || confirmationText) && (
        <div className="flex flex-col gap-3.5 px-6 pt-3.5 pb-5">
          {children}
          {confirmationText && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={inputId} className="text-body leading-[normal] font-medium text-ink">
                {confirmationLabel ?? fillNodes(translate("Type {text} to confirm"), { text: <span className="font-semibold">{confirmationText}</span> })}
              </Label>
              <Input
                id={inputId}
                size="md"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                autoComplete="off"
                frameClassName={cn(destructive && "focus-within:border-expense focus-within:error-halo")}
              />
              {matches && confirmationMatchedText && (
                <span className="flex items-center gap-2 text-small text-emerald">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                  {translate(confirmationMatchedText)}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      {/* The design's dialog foot: a strip across the bottom of the card. */}
      <AlertDialogFooter className="mt-0 flex-row flex-wrap items-center justify-end gap-2.5 border-t border-line bg-strip px-6 py-3.5">
        {footerStart && <div className="mr-auto">{footerStart}</div>}
        <AlertDialogCancel disabled={isPending} className={cn(BUTTON, "border-input bg-surface px-3.5 text-ink hover:bg-surface-sunken")}>
          {translate("Cancel")}
        </AlertDialogCancel>
        <AlertDialogAction
          variant={variant}
          disabled={isPending || confirmDisabled || !isConfirmationMet}
          className={cn(BUTTON, "shadow-button", destructive ? "bg-expense-fill text-white hover:bg-expense" : "bg-primary text-primary-foreground hover:bg-emerald-hover")}
          onClick={(event) => {
            // Radix would close the dialog before the mutation resolves.
            event.preventDefault();
            onConfirm();
          }}
        >
          {isPending ? <Loader size={14} label={translate(pendingLabel)} /> : ConfirmIcon && <ConfirmIcon className="size-4" aria-hidden="true" />}
          {translate(isPending ? pendingLabel : confirmLabel)}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
};

// Accessible replacement for window.confirm(): focus-trapped, keyboard
// friendly, and it stays open (with a spinner) until the action finishes --
// the caller closes it on success. Drawn as the design's confirm card
// (AdminSuspendDialog): 500px, 20px corners, the icon on a 44px tile, the
// question, the explanation, then the strip foot.
const ConfirmDialog = ({ open, onOpenChange, title, description, icon, isPending = false, wide = false, ...bodyProps }: ConfirmDialogProps) => {
  const { translate } = useLocale();
  const destructive = bodyProps.variant === "destructive";
  const Icon = icon ?? (destructive ? AlertTriangle : Info);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Don't let Escape/Cancel abandon a request that's mid-flight.
        if (!isPending) onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent className={cn("max-w-[calc(100vw-2rem)]! gap-0 overflow-hidden rounded-[20px] bg-surface p-0 text-ink shadow-overlay ring-0", wide ? "sm:max-w-130!" : "sm:max-w-125!")}>
        <div className="flex gap-3.5 px-6 pt-5.5 pb-2">
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-field", destructive ? "bg-expense-soft text-expense" : "bg-mint-50 text-emerald")}>
            <Icon className="size-5.5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <AlertDialogTitle className="text-h3 text-ink">{translate(title)}</AlertDialogTitle>
            <AlertDialogDescription className="text-body leading-normal text-ink-soft">{typeof description === "string" ? translate(description) : description}</AlertDialogDescription>
          </div>
        </div>
        <ConfirmBody isPending={isPending} {...bodyProps} />
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
