"use client";

import { useId, useState } from "react";
import Loader from "@/components/shared/Loader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  onConfirm: () => void;
  confirmLabel?: string;
  pendingLabel?: string;
  variant?: "default" | "destructive";
  isPending?: boolean;
  confirmDisabled?: boolean;
  // For irreversible actions: the admin must type this exact text (e.g. the
  // workspace name) before the confirm button enables.
  confirmationText?: string;
  // Extra content between the description and the buttons.
  children?: React.ReactNode;
}

type ConfirmBodyProps = Omit<ConfirmDialogProps, "open" | "onOpenChange" | "title" | "description">;

// Rendered inside AlertDialogContent, which unmounts on close -- so the typed
// confirmation starts empty on every open.
const ConfirmBody = ({
  onConfirm,
  confirmLabel = "Confirm",
  pendingLabel = "Working...",
  variant = "default",
  isPending = false,
  confirmDisabled = false,
  confirmationText,
  children,
}: ConfirmBodyProps) => {
  const inputId = useId();
  const [typed, setTyped] = useState("");
  const isConfirmationMet = !confirmationText || typed.trim() === confirmationText;

  return (
    <>
      {children}
      {confirmationText && (
        <div className="space-y-1.5">
          <Label htmlFor={inputId}>
            Type <span className="font-semibold">{confirmationText}</span> to confirm
          </Label>
          <Input id={inputId} value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" />
        </div>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          variant={variant}
          disabled={isPending || confirmDisabled || !isConfirmationMet}
          onClick={(event) => {
            // Radix would close the dialog before the mutation resolves.
            event.preventDefault();
            onConfirm();
          }}
        >
          {isPending && <Loader size={14} label={pendingLabel} />}
          {isPending ? pendingLabel : confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
};

// Accessible replacement for window.confirm(): focus-trapped, keyboard
// friendly, and it stays open (with a spinner) until the action finishes --
// the caller closes it on success.
const ConfirmDialog = ({ open, onOpenChange, title, description, isPending = false, ...bodyProps }: ConfirmDialogProps) => {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Don't let Escape/Cancel abandon a request that's mid-flight.
        if (!isPending) onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <ConfirmBody isPending={isPending} {...bodyProps} />
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
