"use client";

import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";

interface FormDialogFooterProps {
  isPending: boolean;
  submitLabel: string;
  pendingLabel?: string;
  variant?: "default" | "destructive";
  disabled?: boolean;
  // Left-aligned secondary action (e.g. "Deactivate" in an edit dialog).
  extra?: React.ReactNode;
}

const FormDialogFooter = ({ isPending, submitLabel, pendingLabel, variant, disabled, extra }: FormDialogFooterProps) => {
  return (
    <DialogFooter className="items-center pt-2 sm:justify-between">
      <div>{extra}</div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={isPending}>
            Cancel
          </Button>
        </DialogClose>
        <AppSubmitButton isPending={isPending} pendingLabel={pendingLabel} variant={variant} disabled={disabled} className="w-auto">
          {submitLabel}
        </AppSubmitButton>
      </div>
    </DialogFooter>
  );
};

export default FormDialogFooter;
