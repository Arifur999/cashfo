"use client";

import { useForm } from "@tanstack/react-form";
import { updateAdminAction } from "@/app/(dashboardLayout)/admin/security/(sections)/admins/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSelectField from "@/components/shared/form/AppSelectField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { IAdminAccount } from "@/types/adminAccount.types";
import { type IUpdateAdminFormValues, updateAdminFormZodSchema } from "@/zod/adminAccount.validation";
import { ADMIN_ROLE_OPTIONS } from "./adminOptions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const { shape } = updateAdminFormZodSchema;

interface EditAdminFormProps {
  admin: IAdminAccount;
  // Your own role is locked, so you can't lock yourself out of this page.
  isSelf: boolean;
  onDone: () => void;
}

const EditAdminForm = ({ admin, isSelf, onDone }: EditAdminFormProps) => {
  const { translate } = useLocale();
  const { run, isPending } = useActionMutation({
    action: (values: IUpdateAdminFormValues) => updateAdminAction(admin.id, values),
    successMessage: (updated) => translate("{name} updated", { name: updated.name }),
    invalidateKeys: [queryKeys.admins.all],
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues: { name: admin.name, role: admin.role } satisfies IUpdateAdminFormValues,
    onSubmit: async ({ value }) => {
      if (await run(value)) {
        onDone();
      }
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <form.Field name="name" validators={{ onChange: shape.name }}>
        {(field) => <AppField field={field} label="Name" autoComplete="off" />}
      </form.Field>
      <form.Field name="role" validators={{ onChange: shape.role }}>
        {(field) => (
          <AppSelectField
            field={field}
            label="Role"
            options={ADMIN_ROLE_OPTIONS}
            disabled={isSelf}
            description={isSelf ? "You can't change your own role." : undefined}
          />
        )}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel="Save changes" pendingLabel="Saving..." />
    </AppForm>
  );
};

export default EditAdminForm;
