"use client";

import { useForm } from "@tanstack/react-form";
import { updateMyNameAction } from "@/app/(dashboardLayout)/admin/account/_action";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import Card from "@/components/smartly/Card";
import Input from "@/components/smartly/form/Input";
import { Button } from "@/components/ui/button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { ADMIN_ROLE_AVATAR, ADMIN_ROLE_CHIP, adminRoleLabel } from "@/lib/adminRoles";
import { queryKeys } from "@/lib/queryKeys";
import { getInitials } from "@/lib/text";
import { cn } from "@/lib/utils";
import type { IAdminUser } from "@/types/auth.types";
import { type IMyNameFormValues, myNameFormZodSchema } from "@/zod/myAccount.validation";
import T from "@/components/shared/T";

const { shape } = myNameFormZodSchema;

// Your name (which you can change), your role and your email (which only
// another super admin can).
const ProfileCard = ({ me }: { me: IAdminUser }) => {
  const { run, isPending } = useActionMutation({
    action: updateMyNameAction,
    successMessage: "Your name is saved",
    invalidateKeys: [queryKeys.myAccount.all],
    // The top bar and the sidebar show the name too.
    refreshRoute: true,
  });
  const form = useForm({
    defaultValues: { name: me.name } satisfies IMyNameFormValues,
    onSubmit: async ({ value, formApi }) => {
      if (await run(value)) formApi.reset(value, { keepDefaultValues: true });
    },
  });
  const roleLine = me.role === "SUPER_ADMIN" ? "Super admin · full access" : adminRoleLabel(me.role);

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-title text-ink"><T>Profile</T></h2>
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className={cn("flex size-13 shrink-0 items-center justify-center rounded-full text-h3 font-bold", ADMIN_ROLE_AVATAR[me.role])}>
          {getInitials(me.name) || "?"}
        </span>
        <span className="flex min-w-0 flex-col items-start gap-1">
          <span className="truncate text-title font-semibold text-ink">{me.name}</span>
          <span className={cn("rounded-full px-2 py-0.5 text-caption font-semibold", ADMIN_ROLE_CHIP[me.role])}>
            <T>{roleLine}</T>
          </span>
        </span>
      </div>
      <AppForm onSubmit={form.handleSubmit} className="flex flex-col gap-4 space-y-0">
        <form.Field name="name" validators={{ onChange: shape.name }}>
          {(field) => <AppField field={field} label="Name" autoComplete="name" />}
        </form.Field>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="my-email" className="text-body font-medium text-ink">
            <T>Email</T>
          </label>
          <Input id="my-email" size="md" value={me.email} readOnly frameClassName="bg-cream text-ink-muted" className="text-ink-muted" />
          <span className="text-small text-ink-muted"><T>Only another super admin can change an admin&apos;s email.</T></span>
        </div>
        <form.Subscribe selector={(state) => [state.isDirty, state.isSubmitting] as const}>
          {([isDirty, isSubmitting]) =>
            isDirty && (
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" className="h-10 border-line-strong bg-surface px-4 font-semibold text-ink hover:bg-surface-sunken" onClick={() => form.reset()}>
                  <T>Discard</T>
                </Button>
                <AppSubmitButton isPending={isPending || isSubmitting} pendingLabel="Saving..." variant="action" size="md" className="w-auto">
                  <T>Save name</T>
                </AppSubmitButton>
              </div>
            )
          }
        </form.Subscribe>
      </AppForm>
    </Card>
  );
};

export default ProfileCard;
