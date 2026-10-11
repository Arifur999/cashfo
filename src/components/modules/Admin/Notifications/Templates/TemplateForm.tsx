"use client";

import { useForm } from "@tanstack/react-form";
import { updateNotificationTemplateAction } from "@/app/(dashboardLayout)/admin/notifications/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { firstZodError } from "@/lib/formValidators";
import { queryKeys } from "@/lib/queryKeys";
import { getPlaceholderError } from "@/lib/templatePlaceholders";
import type { INotificationTemplate } from "@/types/notification.types";
import { type INotificationTemplateFormValues, notificationTemplateFormZodSchema } from "@/zod/notification.validation";
import VariableChips from "./VariableChips";

const { shape } = notificationTemplateFormZodSchema;

interface TemplateFormProps {
  template: INotificationTemplate;
  onDone: () => void;
}

// English and Bangla side by side; every {{placeholder}} must be one of the
// template's declared variables, or users would receive it verbatim.
const TemplateForm = ({ template, onDone }: TemplateFormProps) => {
  const isEmail = template.channel === "EMAIL";
  const checkText = (schema: typeof shape.bodyEn) => ({ value }: { value: string }) =>
    firstZodError(schema, value) ?? getPlaceholderError(value, template.variables);

  const { run, isPending } = useActionMutation({
    action: (values: INotificationTemplateFormValues) => updateNotificationTemplateAction(template.id, { ...values, isEmail }),
    successMessage: (saved) => `Saved ${saved.key}`,
    invalidateKeys: [queryKeys.notificationTemplates.all],
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues: {
      subjectEn: template.subjectEn ?? "",
      subjectBn: template.subjectBn ?? "",
      bodyEn: template.bodyEn,
      bodyBn: template.bodyBn,
    } satisfies INotificationTemplateFormValues,
    onSubmit: async ({ value }) => {
      if (await run(value)) {
        onDone();
      }
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <VariableChips variables={template.variables} />
      {isEmail && (
        <div className="grid gap-5 sm:grid-cols-2">
          <form.Field name="subjectEn" validators={{ onChange: checkText(shape.subjectEn) }}>
            {(field) => <AppField field={field} label="Subject (English)" />}
          </form.Field>
          <form.Field name="subjectBn" validators={{ onChange: checkText(shape.subjectBn) }}>
            {(field) => <AppField field={field} label="Subject (Bangla)" />}
          </form.Field>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <form.Field name="bodyEn" validators={{ onChange: checkText(shape.bodyEn) }}>
          {(field) => <AppTextareaField field={field} label="Message (English)" rows={6} />}
        </form.Field>
        <form.Field name="bodyBn" validators={{ onChange: checkText(shape.bodyBn) }}>
          {(field) => <AppTextareaField field={field} label="Message (Bangla)" rows={6} />}
        </form.Field>
      </div>
      <FormDialogFooter isPending={isPending} submitLabel="Save template" pendingLabel="Saving..." />
    </AppForm>
  );
};

export default TemplateForm;
