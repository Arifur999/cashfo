"use client";

import { useForm } from "@tanstack/react-form";
import { useId } from "react";
import { updateAdminAction } from "@/app/(dashboardLayout)/admin/security/(sections)/admins/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import T from "@/components/shared/T";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { IAdminAccount } from "@/types/adminAccount.types";
import { type IUpdateAdminFormValues, updateAdminFormZodSchema } from "@/zod/adminAccount.validation";
import RoleChoices from "./RoleChoices";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const { shape } = updateAdminFormZodSchema;

interface EditAdminFormProps {
  admin: IAdminAccount;
  // Your own role is locked, so you can't lock yourself out of this page.
  isSelf: boolean;
  onDone: () => void;
}

// Change role: the four role cards (not on your own row), then the name.
const EditAdminForm = ({ admin, isSelf, onDone }: EditAdminFormProps) => {
  const { translate } = useLocale();
  const roleLegend = useId();
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
    <AppForm onSubmit={form.handleSubmit} className="space-y-4">
      {!isSelf && (
        <fieldset className="flex flex-col gap-2">
          <legend id={roleLegend} className="mb-2 text-[13.5px] font-medium text-ink">
            <T>Role</T>
          </legend>
          <form.Field name="role">{(field) => <RoleChoices value={field.state.value} onChange={field.handleChange} labelledBy={roleLegend} />}</form.Field>
        </fieldset>
      )}
      <form.Field name="name" validators={{ onChange: shape.name }}>
        {(field) => <AppField field={field} label="Name" autoComplete="off" description={isSelf ? "You can't change your own role." : undefined} />}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel="Save changes" pendingLabel="Saving..." />
    </AppForm>
  );
};

export default EditAdminForm;
