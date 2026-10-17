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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  // workspace name) before the confirm button enables.
  confirmationText?: string;
  // "Type the workspace name to confirm:" -- defaults to naming the text.
  confirmationLabel?: React.ReactNode;
  // Shown in green once the typed text matches ("Matches the workspace name").
  confirmationMatchedText?: string;
  // Extra content between the description and the buttons.
  children?: React.ReactNode;
}

type ConfirmBodyProps = Omit<ConfirmDialogProps, "open" | "onOpenChange" | "title" | "description" | "icon">;

const BUTTON = "h-10 rounded-md px-4 text-body font-semibold";

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
}: ConfirmBodyProps) => {
  const inputId = useId();
  const [typed, setTyped] = useState("");
  const matches = Boolean(confirmationText) && typed.trim() === confirmationText;
  const isConfirmationMet = !confirmationText || matches;
  const destructive = variant === "destructive";

  return (
    <>
      {(children || confirmationText) && (
        <div className="flex flex-col gap-4 px-6 pt-4 pb-5">
          {children}
          {confirmationText && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={inputId} className="text-body font-medium text-ink">
                {confirmationLabel ?? (
                  <>
                    Type <span className="font-semibold">{confirmationText}</span> to confirm
                  </>
                )}
              </Label>
              <Input
                id={inputId}
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                autoComplete="off"
                className={cn(
                  "h-11 rounded-md border-line-strong bg-surface text-body-lg text-ink",
                  destructive && "focus-visible:border-expense focus-visible:ring-expense/15",
                )}
              />
              {matches && confirmationMatchedText && (
                <span className="flex items-center gap-2 text-small text-emerald">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                  {confirmationMatchedText}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      {/* The design's dialog foot: a cream strip across the bottom of the card. */}
      <AlertDialogFooter className="mt-0 flex-row items-center justify-end gap-3 border-t border-line bg-cream px-6 py-4">
        <AlertDialogCancel disabled={isPending} className={cn(BUTTON, "border-line-strong bg-surface text-ink hover:bg-cream")}>
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          variant={variant}
          disabled={isPending || confirmDisabled || !isConfirmationMet}
          className={cn(BUTTON, "text-white shadow-[0_1px_2px_rgba(11,61,46,0.14)]", destructive ? "bg-expense-fill hover:bg-expense" : "bg-emerald hover:bg-forest")}
          onClick={(event) => {
            // Radix would close the dialog before the mutation resolves.
            event.preventDefault();
            onConfirm();
          }}
        >
          {isPending ? <Loader size={14} label={pendingLabel} /> : ConfirmIcon && <ConfirmIcon className="size-4" aria-hidden="true" />}
          {isPending ? pendingLabel : confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
};

// Accessible replacement for window.confirm(): focus-trapped, keyboard
// friendly, and it stays open (with a spinner) until the action finishes --
// the caller closes it on success. Drawn as the design's confirm card: an
// icon in a circle, the question, the explanation, then the cream foot.
const ConfirmDialog = ({ open, onOpenChange, title, description, icon, isPending = false, ...bodyProps }: ConfirmDialogProps) => {
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
      <AlertDialogContent className="max-w-[calc(100vw-2rem)]! gap-0 overflow-hidden rounded-xl bg-surface p-0 text-ink shadow-overlay ring-0 sm:max-w-130!">
        <div className="flex gap-4 px-6 pt-6 pb-2">
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", destructive ? "bg-expense-soft text-expense" : "bg-mint-50 text-emerald")}>
            <Icon className="size-5.5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-2">
            <AlertDialogTitle className="text-h3 text-ink">{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-body leading-relaxed text-ink-2">{description}</AlertDialogDescription>
          </div>
        </div>
        <ConfirmBody isPending={isPending} {...bodyProps} />
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
