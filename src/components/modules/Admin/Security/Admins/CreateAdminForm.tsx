"use client";

import { useForm } from "@tanstack/react-form";
import { createAdminAction } from "@/app/(dashboardLayout)/admin/security/(sections)/admins/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSelectField from "@/components/shared/form/AppSelectField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { ICreatedAdmin } from "@/types/adminAccount.types";
import { createAdminFormZodSchema, type ICreateAdminFormValues } from "@/zod/adminAccount.validation";
import { ADMIN_ROLE_OPTIONS } from "./adminOptions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const { shape } = createAdminFormZodSchema;

const DEFAULT_VALUES: ICreateAdminFormValues = { name: "", email: "", role: "SUPPORT_ADMIN" };

// Mounted inside the dialog content, so each open starts empty.
const CreateAdminForm = ({ onCreated }: { onCreated: (admin: ICreatedAdmin) => void }) => {
  const { translate } = useLocale();
  const { run, isPending } = useActionMutation({
    action: createAdminAction,
    successMessage: (admin) => translate("{name}'s account is ready", { name: admin.name }),
    // The new account also joins the assignee and audit-log filters.
    invalidateKeys: [queryKeys.admins.all],
    onSuccess: onCreated,
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      await run(value);
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <form.Field name="name" validators={{ onChange: shape.name }}>
        {(field) => <AppField field={field} label="Name" autoComplete="off" />}
      </form.Field>
      <form.Field name="email" validators={{ onChange: shape.email }}>
        {(field) => <AppField field={field} label="Email" type="email" autoComplete="off" description="They sign in with this address." />}
      </form.Field>
      <form.Field name="role" validators={{ onChange: shape.role }}>
        {(field) => <AppSelectField field={field} label="Role" options={ADMIN_ROLE_OPTIONS} description="Decides which sections they can manage." />}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel="Add admin" pendingLabel="Adding..." />
    </AppForm>
  );
};

export default CreateAdminForm;
