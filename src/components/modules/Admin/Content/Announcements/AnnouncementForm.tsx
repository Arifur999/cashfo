"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createAnnouncementAction, updateAnnouncementAction } from "@/app/(dashboardLayout)/admin/content/announcements/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSelectField from "@/components/shared/form/AppSelectField";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { dateTimeInputToIso } from "@/lib/date";
import { firstZodError } from "@/lib/formValidators";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/number";
import { queryKeys } from "@/lib/queryKeys";
import { planAnalyticsQuery, plansQuery } from "@/queries/plan.queries";
import type { IAnnouncement } from "@/types/announcement.types";
import { ALL_PLANS, announcementFormZodSchema, getScheduleError, type IAnnouncementFormValues } from "@/zod/announcement.validation";
import { buildAudienceOptions } from "./announcementOptions";
import AnnouncementPreview from "./AnnouncementPreview";
import AnnouncementTypeField from "./AnnouncementTypeField";
import T from "@/components/shared/T";

const { shape } = announcementFormZodSchema;

interface AnnouncementFormProps {
  defaultValues: IAnnouncementFormValues;
  // Editing this announcement; absent means creating one.
  announcement?: IAnnouncement;
  onDone: () => void;
}

// "Schedule" when the banner starts later, "Publish" when it starts now.
const submitLabel = (announcement: IAnnouncement | undefined, startAt: string) => {
  if (announcement) return "Save changes";
  const start = startAt ? new Date(dateTimeInputToIso(startAt)).getTime() : NaN;
  return Number.isFinite(start) && start > Date.now() + 60_000 ? "Schedule" : "Publish";
};

// The design's announcement drawer: the kind, both languages side by side,
// who sees it and when, and a preview of the banner with how many people
// it reaches. Mounted inside the drawer, so each open starts from
// defaultValues.
const AnnouncementForm = ({ defaultValues, announcement, onDone }: AnnouncementFormProps) => {
  const plans = useQuery(plansQuery()).data?.data;
  const analytics = useQuery(planAnalyticsQuery()).data?.data;
  const { translate } = useLocale();
  const audienceOptions = useMemo(() => buildAudienceOptions(plans ?? [], translate), [plans, translate]);

  const { run, isPending } = useActionMutation({
    action: (values: IAnnouncementFormValues) => (announcement ? updateAnnouncementAction(announcement.id, values) : createAnnouncementAction(values)),
    successMessage: announcement ? "Announcement updated" : "Announcement saved",
    invalidateKeys: [queryKeys.announcements.all],
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      if (await run(value)) {
        onDone();
      }
    },
  });

  // "About 1,076 people on the Free plan will see it."
  const reach = (targetPlan: string) => {
    if (!analytics) return null;
    if (targetPlan === ALL_PLANS) return translate("About {count} people will see it.", { count: formatNumber(analytics.summary.totalUsers) });
    const plan = analytics.perPlan.find((entry) => entry.planId === targetPlan);
    return plan ? translate("About {count} people on the {plan} plan will see it.", { count: formatNumber(plan.totalUsers), plan: plan.planName }) : null;
  };

  return (
    <AppForm onSubmit={form.handleSubmit} className="flex flex-1 flex-col gap-4 space-y-0">
      <form.Field name="type" validators={{ onChange: shape.type }}>
        {(field) => <AnnouncementTypeField field={field} />}
      </form.Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <form.Field name="title" validators={{ onChange: shape.title }}>
          {(field) => <AppField field={field} label="Title, English" size="sm" />}
        </form.Field>
        <form.Field name="titleBn" validators={{ onChange: shape.titleBn }}>
          {(field) => <AppField field={field} label="Title, বাংলা" size="sm" className="font-bn" />}
        </form.Field>
        <form.Field name="body" validators={{ onChange: shape.body }}>
          {(field) => <AppTextareaField field={field} label="Message, English" rows={2} />}
        </form.Field>
        <form.Field name="bodyBn" validators={{ onChange: shape.bodyBn }}>
          {(field) => <AppTextareaField field={field} label="Message, বাংলা" rows={2} className="font-bn" />}
        </form.Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <form.Field name="targetPlan" validators={{ onChange: shape.targetPlan }}>
          {(field) => <AppSelectField field={field} label="Show to" options={audienceOptions} />}
        </form.Field>
        <form.Field name="startAt" validators={{ onChange: shape.startAt }}>
          {(field) => <AppField field={field} label="Starts" type="datetime-local" size="sm" />}
        </form.Field>
        <form.Field
          name="endAt"
          validators={{
            onChangeListenTo: ["startAt"],
            onChange: ({ value, fieldApi }) => firstZodError(shape.endAt, value) ?? getScheduleError(fieldApi.form.getFieldValue("startAt"), value),
          }}
        >
          {(field) => <AppField field={field} label="Ends" type="datetime-local" size="sm" />}
        </form.Field>
      </div>
      <form.Subscribe selector={(state) => state.values}>
        {(values) => (
          <div className="flex flex-col gap-2 rounded-lg bg-surface-sunken p-3">
            <span className="text-caption font-semibold text-ink-muted"><T>Preview in the app · English</T></span>
            <AnnouncementPreview type={values.type} title={values.title} body={values.body} />
            {reach(values.targetPlan) && <span className="text-caption text-ink-muted">{reach(values.targetPlan)}</span>}
          </div>
        )}
      </form.Subscribe>
      <form.Subscribe selector={(state) => state.values.startAt}>
        {(startAt) => <FormDialogFooter pinned isPending={isPending} submitLabel={submitLabel(announcement, startAt)} pendingLabel="Saving..." />}
      </form.Subscribe>
    </AppForm>
  );
};

export default AnnouncementForm;
