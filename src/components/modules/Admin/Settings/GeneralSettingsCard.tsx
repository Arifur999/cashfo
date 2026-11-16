"use client";

import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSelectField from "@/components/shared/form/AppSelectField";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { IPlatformSettings } from "@/types/settings.types";
import { generalSettingsFormZodSchema as schema } from "@/zod/settings.validation";
import { lastChangeText } from "./lastChange";
import { CURRENCY_OPTIONS, TIME_ZONE_OPTIONS, withCurrent } from "./settingsOptions";
import { useSettingsForm } from "./useSettingsForm";

// The design's General card: name, support email, default currency and
// time zone, with the save bar at its foot. Other roles see it locked. Each
// field says what it does today: only the support email is shown anywhere
// yet, and new workspaces still start in BDT on Dhaka time.
const GeneralSettingsCard = ({ settings, canManage }: { settings: IPlatformSettings; canManage: boolean }) => {
  const { form, isPending } = useSettingsForm(settings);
  const { translate, locale } = useLocale();
  const disabled = !canManage;

  return (
    <Card padding="none" className="overflow-hidden">
      <AppForm onSubmit={form.handleSubmit} className="space-y-0">
        <h2 className="px-5 pt-4 pb-1 text-title text-ink">
          <T>General</T>
        </h2>
        <div className="grid gap-4 px-5 pt-4 pb-5 sm:grid-cols-2">
          <form.Field name="platformName" validators={{ onChange: schema.shape.platformName }}>
            {(field) => <AppField field={field} label="Platform name" disabled={disabled} description="Signs every email (welcome, password reset, support replies). The browser tab still says Smartly." />}
          </form.Field>
          <form.Field name="supportEmail" validators={{ onChange: schema.shape.supportEmail }}>
            {(field) => <AppField field={field} label="Support email" type="email" disabled={disabled} description="Where users write from Settings › Help. Same as the email in Company and help page." />}
          </form.Field>
          <form.Field name="defaultCurrency" validators={{ onChange: schema.shape.defaultCurrency }}>
            {(field) => (
              <AppSelectField
                field={field}
                label="Default currency"
                options={withCurrent(CURRENCY_OPTIONS, settings.defaultCurrency)}
                disabled={disabled}
                description="Saved for later: new workspaces still start in BDT."
              />
            )}
          </form.Field>
          <form.Field name="defaultTimezone" validators={{ onChange: schema.shape.defaultTimezone }}>
            {(field) => (
              <AppSelectField
                field={field}
                label="Default time zone"
                options={withCurrent(TIME_ZONE_OPTIONS, settings.defaultTimezone)}
                disabled={disabled}
                description="Saved for later: the app still counts its days on Dhaka time."
              />
            )}
          </form.Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-strip px-5 py-3 sm:flex-nowrap">
          <span className="min-w-0 flex-1 basis-60 text-[12.5px] text-ink-muted">
            {lastChangeText(settings.lastChange, translate, locale)} <T>{canManage ? "Every save goes to the audit log." : "Only super admins can change these."}</T>
          </span>
          {canManage && (
            <form.Subscribe selector={(state) => [state.isDirty, state.isSubmitting] as const}>
              {([isDirty, isSubmitting]) => (
                <span className="ml-auto flex shrink-0 gap-2">
                  <Button variant="secondary" size="md" disabled={!isDirty || isSubmitting} onClick={() => form.reset()}>
                    <T>Discard</T>
                  </Button>
                  <AppSubmitButton isPending={isPending || isSubmitting} disabled={!isDirty} pendingLabel="Saving..." variant="action" size="md" className="w-auto">
                    <T>Save changes</T>
                  </AppSubmitButton>
                </span>
              )}
            </form.Subscribe>
          )}
        </div>
      </AppForm>
    </Card>
  );
};

export default GeneralSettingsCard;
