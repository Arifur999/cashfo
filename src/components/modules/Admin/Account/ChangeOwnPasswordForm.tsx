"use client";

import { useForm } from "@tanstack/react-form";
import { changeOwnPasswordAction } from "@/app/-actions/changeOwnPasswordAction";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppForm from "@/components/shared/form/AppForm";
import AppPasswordField from "@/components/shared/form/AppPasswordField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { changeOwnPasswordFormZodSchema, getPasswordMismatchError, type IChangeOwnPasswordFormValues } from "@/zod/auth.validation";

const { shape } = changeOwnPasswordFormZodSchema;

// An admin's own password, from the account menu. Admins used to depend on
// a super admin resetting it for them.
const ChangeOwnPasswordForm = ({ onDone }: { onDone: () => void }) => {
  const { run, isPending } = useActionMutation({
    action: ({ currentPassword, newPassword }: IChangeOwnPasswordFormValues) => changeOwnPasswordAction({ currentPassword, newPassword }),
    successMessage: "Password changed -- your other sessions were signed out",
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } satisfies IChangeOwnPasswordFormValues,
    onSubmit: async ({ value }) => {
      if (await run(value)) {
        onDone();
      }
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <form.Field name="currentPassword" validators={{ onChange: shape.currentPassword }}>
        {(field) => <AppPasswordField field={field} label="Current password" autoComplete="current-password" />}
      </form.Field>
      <form.Field name="newPassword" validators={{ onChange: shape.newPassword }}>
        {(field) => <AppPasswordField field={field} label="New password" autoComplete="new-password" description="At least 8 characters, with a letter and a number." />}
      </form.Field>
      <form.Field
        name="confirmPassword"
        validators={{
          onChangeListenTo: ["newPassword"],
          onChange: ({ value, fieldApi }) => getPasswordMismatchError(fieldApi.form.getFieldValue("newPassword"), value) ?? (value ? undefined : "Type the password again"),
        }}
      >
        {(field) => <AppPasswordField field={field} label="Confirm new password" autoComplete="new-password" />}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel="Change password" pendingLabel="Changing..." />
    </AppForm>
  );
};

export default ChangeOwnPasswordForm;
