"use client";

import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import Button from "@/components/smartly/Button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";
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
  // itself must be a flex column that fills the drawer), and stay in view
  // while a long one scrolls, as the design's drawers keep their foot.
  pinned?: boolean;
  // A second action beside the submit button in Cancel's place (the
  // campaign dialog's Save as draft); the close button still cancels.
  secondary?: React.ReactNode;
}

const FormDialogFooter = ({ isPending, submitLabel, pendingLabel, variant, disabled, extra, pinned = false, secondary }: FormDialogFooterProps) => {
  const { translate } = useLocale();
  return (
    // The design's dialog foot: a strip across the bottom of the card.
    <DialogFooter className={cn("-mx-6 -mb-4.5 items-center border-t border-line bg-strip px-6 py-3.5 sm:justify-between", pinned ? "sticky bottom-0 z-10 mt-auto" : "mt-4")}>
      <div>{extra}</div>
      <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
        {/* The secondary button ConfirmDialog's Cancel is: white, the
            line-strong edge, sunken on hover. */}
        {secondary ?? (
          <DialogClose asChild>
            <Button type="button" variant="secondary" size="md" disabled={isPending}>
              {translate("Cancel")}
            </Button>
          </DialogClose>
        )}
        <AppSubmitButton isPending={isPending} pendingLabel={pendingLabel} variant={variant === "destructive" ? "destructive" : "action"} disabled={disabled} size="md" className="w-auto">
          {translate(submitLabel)}
        </AppSubmitButton>
      </div>
    </DialogFooter>
  );
};

export default FormDialogFooter;
