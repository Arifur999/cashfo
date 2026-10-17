"use client";

import { useForm } from "@tanstack/react-form";
import { createAccountTemplateAction, updateAccountTemplateAction } from "@/app/(dashboardLayout)/admin/content/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppChipsField from "@/components/shared/form/AppChipsField";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSelectField from "@/components/shared/form/AppSelectField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { IAccountTemplate } from "@/types/accountTemplate.types";
import { accountTemplateFormZodSchema, type IAccountTemplateFormValues } from "@/zod/accountTemplate.validation";
import { ACCOUNT_TYPE_OPTIONS, WORKSPACE_TYPE_OPTIONS } from "./accountTemplateOptions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localName } from "@/lib/i18n/message";

const { shape } = accountTemplateFormZodSchema;

interface AccountTemplateFormProps {
  defaultValues: IAccountTemplateFormValues;
  // Editing this account; absent means creating one.
  template?: IAccountTemplate;
  // Creating a sub-account under this top-level account.
  parent?: IAccountTemplate;
  onDone: () => void;
}

// Mounted inside the dialog content, so each open starts from defaultValues.
const AccountTemplateForm = ({ defaultValues, template, parent, onDone }: AccountTemplateFormProps) => {
  const { locale, translate } = useLocale();
  // A parent and its children must share one type.
  const isTypeLocked = Boolean(parent || template?.parentId || template?.children?.length);

  const { run, isPending } = useActionMutation({
    action: (values: IAccountTemplateFormValues) =>
      template ? updateAccountTemplateAction(template.id, values) : createAccountTemplateAction(values, parent?.id),
    successMessage: template ? "Account updated" : parent ? translate("Sub-account added under {name}", { name: localName(locale, parent) }) : "Account created",
    // Categories show the names of the accounts they link to.
    invalidateKeys: [queryKeys.accountTemplates.all, queryKeys.categories.all],
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      if (await run(value)) {
        onDone();
      }
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <form.Field name="name" validators={{ onChange: shape.name }}>
          {(field) => <AppField field={field} label="Name (English)" placeholder="e.g. Cash in hand" />}
        </form.Field>
        <form.Field name="nameBn" validators={{ onChange: shape.nameBn }}>
          {(field) => <AppField field={field} label="Name (Bangla)" placeholder="e.g. হাতে নগদ" />}
        </form.Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <form.Field name="accountType" validators={{ onChange: shape.accountType }}>
          {(field) => (
            <AppSelectField
              field={field}
              label="Account type"
              options={ACCOUNT_TYPE_OPTIONS}
              disabled={isTypeLocked}
              description={isTypeLocked ? "Shared with its parent / sub-accounts." : undefined}
            />
          )}
        </form.Field>
        <form.Field name="accountSubtype" validators={{ onChange: shape.accountSubtype }}>
          {(field) => <AppField field={field} label="Subtype" placeholder="e.g. cash, bank, mfs" description="Optional grouping key." />}
        </form.Field>
      </div>
      <form.Field name="appliesTo" validators={{ onChange: shape.appliesTo }}>
        {(field) => (
          <AppChipsField
            field={field}
            label="Seeded into"
            options={WORKSPACE_TYPE_OPTIONS}
            description="New workspaces of these kinds start with this account."
          />
        )}
      </form.Field>
      <form.Field name="displayOrder" validators={{ onChange: shape.displayOrder }}>
        {(field) => <AppField field={field} label="Display order" type="number" description="Lower numbers are listed first." />}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel={template ? "Save changes" : "Create account"} pendingLabel="Saving..." />
    </AppForm>
  );
};

export default AccountTemplateForm;
