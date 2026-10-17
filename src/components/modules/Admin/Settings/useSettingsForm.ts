"use client";

import { useForm } from "@tanstack/react-form";
import { updateSettingsAction } from "@/app/(dashboardLayout)/admin/settings/_action";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { IPlatformSettings } from "@/types/settings.types";
import type { IGeneralSettingsFormValues } from "@/zod/settings.validation";

const toFormValues = (settings: IPlatformSettings): IGeneralSettingsFormValues => ({
  platformName: settings.platformName,
  supportEmail: settings.supportEmail,
  defaultCurrency: settings.defaultCurrency,
  defaultTimezone: settings.defaultTimezone,
});

// The General card's form. It lives in a hook so its type can be shared
// with the card without spelling out TanStack Form's generics.
export const useSettingsForm = (initial: IPlatformSettings) => {
  const { run, isPending } = useActionMutation({
    action: updateSettingsAction,
    successMessage: "Settings saved",
    invalidateKeys: [queryKeys.settings.all],
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues: toFormValues(initial),
    onSubmit: async ({ value, formApi }) => {
      if (await run(value)) {
        // Re-baseline on the saved values so Discard and "unsaved changes"
        // start from here. keepDefaultValues: the next render's useForm()
        // may still hold the pre-save `initial` until the refetch lands.
        formApi.reset(value, { keepDefaultValues: true });
      }
    },
  });

  return { form, isPending };
};

export type SettingsFormApi = ReturnType<typeof useSettingsForm>["form"];
