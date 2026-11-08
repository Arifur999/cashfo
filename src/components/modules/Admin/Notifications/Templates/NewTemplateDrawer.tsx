"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { createNotificationTemplateAction } from "@/app/(dashboardLayout)/admin/notifications/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { NOTIFICATION_CHANNELS, type INotificationTemplate, type NotificationChannel } from "@/types/notification.types";
import { type INewTemplateFormValues, newTemplateFormZodSchema, templateVariables } from "@/zod/notification.validation";
import { CHANNEL_META } from "../notificationOptions";

const { shape } = newTemplateFormZodSchema;

const DEFAULTS: INewTemplateFormValues = { key: "", channel: "EMAIL", subjectEn: "", subjectBn: "", bodyEn: "", bodyBn: "" };

const CHANNEL_OPTIONS = NOTIFICATION_CHANNELS.map((channel) => ({ value: channel, label: CHANNEL_META[channel].label }));

interface NewTemplateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (template: INotificationTemplate) => void;
}

// A template made here, for campaigns (the board's promo_offer): its key,
// how it is sent, the subject for email, and the message in both languages.
// The {{placeholders}} it uses become its variables.
const NewTemplateDrawer = ({ open, onOpenChange, onCreated }: NewTemplateDrawerProps) => (
  <FormDrawer open={open} onOpenChange={onOpenChange} title="New template" description="For campaigns. The key is how a campaign picks it." width="lg" centered>
    {open && <NewTemplateForm onCreated={onCreated} />}
  </FormDrawer>
);

const NewTemplateForm = ({ onCreated }: { onCreated: (template: INotificationTemplate) => void }) => {
  const { translate } = useLocale();
  const { run, isPending } = useActionMutation({
    action: createNotificationTemplateAction,
    successMessage: (created) => translate("Added {key}", { key: created.key }),
    invalidateKeys: [queryKeys.notificationTemplates.all],
    refreshRoute: false,
    onSuccess: onCreated,
  });
  const form = useForm({
    defaultValues: DEFAULTS,
    onSubmit: async ({ value }) => {
      await run(value);
    },
  });
  const values = useStore(form.store, (state) => state.values);
  const variables = templateVariables(values.subjectEn, values.subjectBn, values.bodyEn, values.bodyBn);
  const isEmail = values.channel === "EMAIL";

  return (
    <AppForm onSubmit={form.handleSubmit} className="flex flex-1 flex-col gap-3.5 space-y-0">
      <form.Field name="key" validators={{ onChange: shape.key }}>
        {(field) => <AppField field={field} label="Key" placeholder="promo_offer" description="Lowercase letters, digits and underscores." className="font-mono" />}
      </form.Field>
      <form.Field name="channel">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <span className="text-body font-medium text-ink">{translate("Send by")}</span>
            <SegmentedControl
              label="Send by"
              variant="pill"
              className="self-start rounded-[9px]"
              options={CHANNEL_OPTIONS}
              value={field.state.value}
              onChange={(channel: NotificationChannel) => field.handleChange(channel)}
            />
          </div>
        )}
      </form.Field>
      {isEmail && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          <form.Field name="subjectEn" validators={{ onChange: shape.subjectEn }}>
            {(field) => <AppField field={field} label="Subject, English" />}
          </form.Field>
          <form.Field name="subjectBn" validators={{ onChange: shape.subjectBn }}>
            {(field) => <AppField field={field} label="Subject, বাংলা" lang="bn" className="font-bn" />}
          </form.Field>
        </div>
      )}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <form.Field name="bodyEn" validators={{ onChange: shape.bodyEn }}>
          {(field) => <AppTextareaField field={field} label="Message, English" rows={5} />}
        </form.Field>
        <form.Field name="bodyBn" validators={{ onChange: shape.bodyBn }}>
          {(field) => <AppTextareaField field={field} label="Message, বাংলা" rows={5} lang="bn" className="font-bn" />}
        </form.Field>
      </div>
      <p className="text-caption text-ink-muted">
        {variables.length > 0
          ? translate("Variables: {list}", { list: variables.map((name) => `{{${name}}}`).join(", ") })
          : translate("Write {example} where the person's own name goes.", { example: "{{userName}}" })}
      </p>
      <FormDialogFooter pinned isPending={isPending} submitLabel="Add template" pendingLabel="Saving..." />
    </AppForm>
  );
};

export default NewTemplateDrawer;
