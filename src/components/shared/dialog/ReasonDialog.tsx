"use client";

import { useForm } from "@tanstack/react-form";
import type { LucideIcon } from "lucide-react";
import Callout from "@/components/shared/Callout";
import AppForm from "@/components/shared/form/AppForm";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { reasonFormZodSchema, REASON_MIN_LENGTH, type IReasonFormValues } from "@/zod/common.validation";
import FormDialog from "./FormDialog";
import FormDialogFooter from "./FormDialogFooter";

interface ReasonFormProps {
  warning?: React.ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  variant?: "default" | "destructive";
  isPending: boolean;
  // Resolves true on success, which closes the dialog.
  onSubmit: (reason: string) => Promise<boolean>;
  onDone: () => void;
  // More under the reason (Suspend's "Also sign out of every device now").
  children?: React.ReactNode;
  // The confirm-card look (below): the icon on the confirm button too.
  confirmIcon?: LucideIcon;
  card?: boolean;
}

const defaultValues: IReasonFormValues = { reason: "" };

// Lives inside the dialog content, which Radix unmounts on close -- so every
// open starts from an empty form without any reset effect.
const ReasonForm = ({ warning, confirmLabel, pendingLabel = "Working...", variant, isPending, onSubmit, onDone, children, confirmIcon: ConfirmIcon, card = false }: ReasonFormProps) => {
  const { translate, locale } = useLocale();
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      if (await onSubmit(value.reason.trim())) {
        onDone();
      }
    },
  });
  const destructive = variant === "destructive";

  return (
    <AppForm onSubmit={form.handleSubmit} className={card ? "space-y-0" : undefined}>
      <div className={cn("flex flex-col", card ? "gap-3.5 px-6 pt-3.5 pb-5" : "gap-4")}>
        {warning && <Callout variant="danger">{warning}</Callout>}
        <form.Field name="reason" validators={{ onChange: reasonFormZodSchema.shape.reason }}>
          {(field) => (
            <AppTextareaField
              field={field}
              label={
                card ? (
                  <>
                    {translate("Reason")} <span className="text-expense">*</span>
                  </>
                ) : (
                  "Reason"
                )
              }
              rows={3}
              placeholder="Explain why"
              description={translate("At least {count} characters. It goes into the audit log, and only admins can see it.", { count: formatCount(REASON_MIN_LENGTH, locale) })}
            />
          )}
        </form.Field>
        {children}
      </div>
      {card ? (
        // The confirm card's foot: Cancel, then the action with its icon.
        <div className="flex items-center justify-end gap-2.5 border-t border-line bg-strip px-6 py-3.5">
          <DialogClose asChild>
            <Button type="button" variant="secondary" size="md" disabled={isPending}>
              {translate("Cancel")}
            </Button>
          </DialogClose>
          <Button type="submit" variant={destructive ? "danger" : "action"} size="md" disabled={isPending} className={cn(destructive && "shadow-button")}>
            {isPending ? <Loader size={14} label={translate(pendingLabel)} /> : ConfirmIcon && <ConfirmIcon className="size-4" aria-hidden="true" />}
            {translate(isPending ? pendingLabel : confirmLabel)}
          </Button>
        </div>
      ) : (
        <FormDialogFooter isPending={isPending} submitLabel={confirmLabel} pendingLabel={pendingLabel} variant={variant} />
      )}
    </AppForm>
  );
};

interface ReasonDialogProps extends Omit<ReasonFormProps, "onDone" | "card"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  // Draws the confirm card (AdminSuspendDialog): the icon on a 44px tile
  // beside the question and its explanation, the reason, then the strip
  // foot. Without it, the form dialog with its titled head.
  icon?: LucideIcon;
}

// Any action that must be justified for the audit trail (suspend, change
// plan, refund, ...): a reason textarea with the shared >=5 char rule.
const ReasonDialog = ({ open, onOpenChange, title, description, icon: Icon, ...formProps }: ReasonDialogProps) => {
  const { translate } = useLocale();
  if (!Icon) {
    return (
      <FormDialog open={open} onOpenChange={onOpenChange} title={title} description={description} size="sm">
        <ReasonForm {...formProps} onDone={() => onOpenChange(false)} />
      </FormDialog>
    );
  }
  const destructive = formProps.variant === "destructive";
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Don't let Escape abandon a request that's mid-flight.
        if (!formProps.isPending) onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
        className="max-h-[90vh] max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto rounded-[20px] border-line bg-surface p-0 text-ink shadow-overlay ring-0 sm:max-w-125"
      >
        <div className="flex gap-3.5 px-6 pt-5.5 pb-2">
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-field", destructive ? "bg-expense-soft text-expense" : "bg-mint-50 text-emerald")}>
            <Icon className="size-5.5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <DialogTitle className="text-h3 text-ink">{translate(title)}</DialogTitle>
            {description && <DialogDescription className="text-body leading-normal text-ink-soft">{typeof description === "string" ? translate(description) : description}</DialogDescription>}
          </div>
        </div>
        <ReasonForm {...formProps} card onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
};

export default ReasonDialog;
