"use client";

import { useForm } from "@tanstack/react-form";
import { updateSettingsAction } from "@/app/(dashboardLayout)/admin/settings/_action";
import { useActionMutation } from "@/hooks/useActionMutation";
import type { IPlatformSettings } from "@/types/settings.types";
import type { IUpdateSettingsFormValues } from "@/zod/settings.validation";

const toFormValues = (settings: IPlatformSettings): IUpdateSettingsFormValues => ({
  ...settings,
  referralRewardAmount: String(settings.referralRewardAmount),
});

// The form lives in a hook so its type can be shared with the section
// components below without spelling out TanStack Form's generics.
export const useSettingsForm = (initial: IPlatformSettings) => {
  const { run, isPending } = useActionMutation({
    action: updateSettingsAction,
    successMessage: "Settings saved",
  });

  const form = useForm({
    defaultValues: toFormValues(initial),
    onSubmit: async ({ value, formApi }) => {
      if (await run(value)) {
        // Re-baseline on the saved values so "unsaved changes" resets.
        // keepDefaultValues matters: a plain reset(value) replaces the form's
        // defaultValues, and the next render's useForm() -- still holding the
        // pre-save `initial` until router.refresh() lands -- would see them
        // differ and snap the untouched fields back to the old values.
        formApi.reset(value, { keepDefaultValues: true });
      }
    },
  });

  return { form, isPending };
};

export type SettingsFormApi = ReturnType<typeof useSettingsForm>["form"];
