"use client";

import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface FormDialogFooterProps {
  isPending: boolean;
  submitLabel: string;
  pendingLabel?: string;
  variant?: "default" | "destructive";
  disabled?: boolean;
  // Left-aligned secondary action (e.g. "Deactivate" in an edit dialog).
  extra?: React.ReactNode;
  // In a drawer: sit at the bottom however short the form is (the form
  // itself must be a flex column that fills the drawer).
  pinned?: boolean;
}

const FormDialogFooter = ({ isPending, submitLabel, pendingLabel, variant, disabled, extra, pinned = false }: FormDialogFooterProps) => {
  return (
    // The design's dialog foot: a cream strip across the bottom of the card.
    <DialogFooter className={cn("-mx-6 -mb-5 items-center border-t border-line bg-cream px-6 py-4 sm:justify-between", pinned ? "mt-auto" : "mt-4")}>
      <div>{extra}</div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={isPending} className="h-10 border-line-strong bg-surface px-4 font-semibold text-ink hover:bg-surface-sunken">
            Cancel
          </Button>
        </DialogClose>
        <AppSubmitButton isPending={isPending} pendingLabel={pendingLabel} variant={variant === "destructive" ? "destructive" : "action"} disabled={disabled} size="md" className="w-auto">
          {submitLabel}
        </AppSubmitButton>
      </div>
    </DialogFooter>
  );
};

export default FormDialogFooter;
