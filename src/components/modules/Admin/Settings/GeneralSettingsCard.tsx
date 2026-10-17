"use client";

import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSelectField from "@/components/shared/form/AppSelectField";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import Card from "@/components/smartly/Card";
import { Button } from "@/components/ui/button";
import { formatDayName } from "@/lib/date";
import type { IPlatformSettings } from "@/types/settings.types";
import { generalSettingsFormZodSchema as schema } from "@/zod/settings.validation";
import { CURRENCY_OPTIONS, TIME_ZONE_OPTIONS, withCurrent } from "./settingsOptions";
import { useSettingsForm } from "./useSettingsForm";

// "Last changed by Nadia Rahman on 14 Sep."
const lastChangeText = (settings: IPlatformSettings) => {
  const change = settings.lastChange;
  if (!change) return "Not changed yet.";
  const day = formatDayName(change.at);
  const when = day === "Today" || day === "Yesterday" ? day.toLowerCase() : `on ${day}`;
  return change.by ? `Last changed by ${change.by} ${when}.` : `Last changed ${when}.`;
};

// The design's General card: name, support email, default currency and
// time zone, with the save bar at its foot. Other roles see it locked.
const GeneralSettingsCard = ({ settings, canManage }: { settings: IPlatformSettings; canManage: boolean }) => {
  const { form, isPending } = useSettingsForm(settings);
  const disabled = !canManage;

  return (
    <Card padding="none" className="overflow-hidden">
      <AppForm onSubmit={form.handleSubmit} className="space-y-0">
        <h2 className="px-5 pt-4 pb-1 text-title text-ink">General</h2>
        <div className="grid gap-4 px-5 pt-4 pb-5 sm:grid-cols-2">
          <form.Field name="platformName" validators={{ onChange: schema.shape.platformName }}>
            {(field) => <AppField field={field} label="Platform name" disabled={disabled} description="Shown in emails and the browser tab" />}
          </form.Field>
          <form.Field name="supportEmail" validators={{ onChange: schema.shape.supportEmail }}>
            {(field) => <AppField field={field} label="Support email" type="email" disabled={disabled} description="Where users write from Settings › Help" />}
          </form.Field>
          <form.Field name="defaultCurrency" validators={{ onChange: schema.shape.defaultCurrency }}>
            {(field) => (
              <AppSelectField
                field={field}
                label="Default currency"
                options={withCurrent(CURRENCY_OPTIONS, settings.defaultCurrency)}
                disabled={disabled}
                description="For new workspaces. Each workspace can change it."
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
                description="Used for daily reports and reminders"
              />
            )}
          </form.Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-cream px-5 py-3">
          <span className="text-small text-ink-muted">
            {lastChangeText(settings)} {canManage ? "Every save goes to the audit log." : "Only super admins can change these."}
          </span>
          {canManage && (
            <form.Subscribe selector={(state) => [state.isDirty, state.isSubmitting] as const}>
              {([isDirty, isSubmitting]) => (
                <span className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!isDirty || isSubmitting}
                    className="h-9.5 border-line-strong bg-surface px-4 font-semibold text-ink hover:bg-surface-sunken"
                    onClick={() => form.reset()}
                  >
                    Discard
                  </Button>
                  <AppSubmitButton isPending={isPending || isSubmitting} disabled={!isDirty} pendingLabel="Saving..." variant="action" size="md" className="h-9.5 w-auto">
                    Save changes
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
