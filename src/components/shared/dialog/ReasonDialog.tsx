"use client";

import { useForm } from "@tanstack/react-form";
import Callout from "@/components/shared/Callout";
import AppForm from "@/components/shared/form/AppForm";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
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
}

const defaultValues: IReasonFormValues = { reason: "" };

// Lives inside the dialog content, which Radix unmounts on close -- so every
// open starts from an empty form without any reset effect.
const ReasonForm = ({ warning, confirmLabel, pendingLabel, variant, isPending, onSubmit, onDone }: ReasonFormProps) => {
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      if (await onSubmit(value.reason.trim())) {
        onDone();
      }
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit}>
      {warning && <Callout variant="danger">{warning}</Callout>}
      <form.Field name="reason" validators={{ onChange: reasonFormZodSchema.shape.reason }}>
        {(field) => (
          <AppTextareaField
            field={field}
            label="Reason"
            rows={3}
            placeholder="Explain why"
            description={`At least ${REASON_MIN_LENGTH} characters. It goes into the audit log, and only admins can see it.`}
          />
        )}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel={confirmLabel} pendingLabel={pendingLabel} variant={variant} />
    </AppForm>
  );
};

interface ReasonDialogProps extends Omit<ReasonFormProps, "onDone"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
}

// Any action that must be justified for the audit trail (suspend, change
// plan, refund, ...): a reason textarea with the shared >=5 char rule.
const ReasonDialog = ({ open, onOpenChange, title, description, ...formProps }: ReasonDialogProps) => {
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={title} description={description} size="sm">
      <ReasonForm {...formProps} onDone={() => onOpenChange(false)} />
    </FormDialog>
  );
};

export default ReasonDialog;
