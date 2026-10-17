"use client";

import { useForm } from "@tanstack/react-form";
import { createTranslationAction } from "@/app/(dashboardLayout)/admin/content/translations/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import { type ITranslationFormValues, translationFormZodSchema } from "@/zod/translation.validation";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const { shape } = translationFormZodSchema;

const DEFAULT_VALUES: ITranslationFormValues = { key: "", en: "", bn: "", context: "" };

// Mounted inside the dialog content, so each open starts empty.
const TranslationForm = ({ onDone }: { onDone: () => void }) => {
  const { translate } = useLocale();
  const { run, isPending } = useActionMutation({
    action: createTranslationAction,
    successMessage: (created) => translate("Added {key}", { key: created.key }),
    invalidateKeys: [queryKeys.translations.all],
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      if (await run(value)) {
        onDone();
      }
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
        <form.Field name="key" validators={{ onChange: shape.key }}>
          {(field) => <AppField field={field} label="Key" placeholder="dashboard.total_income" description="A name to find the string by here." />}
        </form.Field>
        <form.Field name="context" validators={{ onChange: shape.context }}>
          {(field) => <AppField field={field} label="Context" placeholder="dashboard" description="Optional group." />}
        </form.Field>
      </div>
      <form.Field name="en" validators={{ onChange: shape.en }}>
        {(field) => (
          <AppTextareaField field={field} label="English" rows={2} description="Exactly as the app shows it: the app finds the string by this text." />
        )}
      </form.Field>
      <form.Field name="bn" validators={{ onChange: shape.bn }}>
        {(field) => <AppTextareaField field={field} label="Bangla" rows={2} description="Replaces the app's own Bangla for this text within a minute of saving. Leave it blank to keep the app's own." />}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel="Add string" pendingLabel="Adding..." />
    </AppForm>
  );
};

export default TranslationForm;
