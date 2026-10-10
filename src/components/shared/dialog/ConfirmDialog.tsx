"use client";

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
  // e.g. until a typed confirmation matches.
  confirmDisabled?: boolean;
  // Extra content between the description and the buttons.
  children?: React.ReactNode;
}

// Accessible replacement for window.confirm(): focus-trapped, keyboard
// friendly, and it stays open (with a spinner) until the action finishes --
// the caller closes it on success.
const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = "Confirm",
  pendingLabel = "Working...",
  variant = "default",
  isPending = false,
  confirmDisabled = false,
  children,
}: ConfirmDialogProps) => {
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
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            disabled={isPending || confirmDisabled}
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
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
