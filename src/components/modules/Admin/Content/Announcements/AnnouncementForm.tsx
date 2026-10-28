"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { createAnnouncementAction, setAnnouncementEnabledAction, updateAnnouncementAction } from "@/app/(dashboardLayout)/admin/content/announcements/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSelectField from "@/components/shared/form/AppSelectField";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import Button from "@/components/smartly/Button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { dateTimeInputToIso } from "@/lib/date";
import { firstZodError } from "@/lib/formValidators";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { planAnalyticsQuery, plansQuery } from "@/queries/plan.queries";
import type { IAnnouncement } from "@/types/announcement.types";
import { ALL_PLANS, announcementFormZodSchema, getScheduleError, type IAnnouncementFormValues } from "@/zod/announcement.validation";
import { buildAudienceOptions } from "./announcementOptions";
import AnnouncementPreview from "./AnnouncementPreview";
import AnnouncementTypeField from "./AnnouncementTypeField";

const { shape } = announcementFormZodSchema;

type PreviewLanguage = "en" | "bn";

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
// who sees it and when, and a preview of the banner, in either language,
// with how many people it reaches. Mounted inside the drawer, so each open
// starts from defaultValues.
const AnnouncementForm = ({ defaultValues, announcement, onDone }: AnnouncementFormProps) => {
  const plans = useQuery(plansQuery()).data?.data;
  const analytics = useQuery(planAnalyticsQuery()).data?.data;
  const { locale, translate } = useLocale();
  const audienceOptions = useMemo(() => buildAudienceOptions(plans ?? [], translate), [plans, translate]);
  const [previewLanguage, setPreviewLanguage] = useState<PreviewLanguage>("en");

  // Turning a banner off (or back on) keeps its schedule; the drawer stays.
  const toggle = useActionMutation({
    action: (isActive: boolean) => setAnnouncementEnabledAction(announcement?.id ?? "", isActive),
    successMessage: (updated) => (updated.isActive ? "Announcement turned on" : "Announcement turned off"),
    invalidateKeys: [queryKeys.announcements.all],
    refreshRoute: false,
    onSuccess: onDone,
  });

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
    if (targetPlan === ALL_PLANS) return translate("About {count} people will see it.", { count: formatCount(analytics.summary.totalUsers, locale) });
    const plan = analytics.perPlan.find((entry) => entry.planId === targetPlan);
    return plan ? translate("About {count} people on the {plan} plan will see it.", { count: formatCount(plan.totalUsers, locale), plan: plan.planName }) : null;
  };

  return (
    <AppForm onSubmit={form.handleSubmit} className="flex flex-1 flex-col gap-3.5 space-y-0">
      <form.Field name="type" validators={{ onChange: shape.type }}>
        {(field) => <AnnouncementTypeField field={field} />}
      </form.Field>
      {/* One height for every field in the drawer: 44px. */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <form.Field name="title" validators={{ onChange: shape.title }}>
          {(field) => <AppField field={field} label="Title, English" />}
        </form.Field>
        <form.Field name="titleBn" validators={{ onChange: shape.titleBn }}>
          {(field) => <AppField field={field} label="Title, বাংলা" lang="bn" className="font-bn" />}
        </form.Field>
        <form.Field name="body" validators={{ onChange: shape.body }}>
          {(field) => <AppTextareaField field={field} label="Message, English" rows={2} />}
        </form.Field>
        <form.Field name="bodyBn" validators={{ onChange: shape.bodyBn }}>
          {(field) => <AppTextareaField field={field} label="Message, বাংলা" rows={2} lang="bn" className="font-bn" />}
        </form.Field>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        <form.Field name="targetPlan" validators={{ onChange: shape.targetPlan }}>
          {(field) => <AppSelectField field={field} label="Show to" options={audienceOptions} />}
        </form.Field>
        <form.Field name="startAt" validators={{ onChange: shape.startAt }}>
          {(field) => <AppField field={field} label="Starts" type="datetime-local" />}
        </form.Field>
        <form.Field
          name="endAt"
          validators={{
            onChangeListenTo: ["startAt"],
            onChange: ({ value, fieldApi }) => firstZodError(shape.endAt, value) ?? getScheduleError(fieldApi.form.getFieldValue("startAt"), value),
          }}
        >
          {(field) => <AppField field={field} label="Ends" type="datetime-local" />}
        </form.Field>
      </div>
      <form.Subscribe selector={(state) => state.values}>
        {(values) => {
          // The app shows a Bangla reader the English of any part not yet in Bangla.
          const titleBn = previewLanguage === "bn" && values.titleBn.trim() !== "";
          const bodyBn = previewLanguage === "bn" && values.bodyBn.trim() !== "";
          const reachText = reach(values.targetPlan);
          return (
            <div className="flex flex-col gap-2 rounded-[14px] bg-surface-sunken p-3">
              {/* "Preview in the app · English": the language is a switch. */}
              <span className="text-caption font-semibold tracking-[0.05em] text-ink-muted uppercase">
                {translate("Preview in the app")} ·{" "}
                <button
                  type="button"
                  onClick={() => setPreviewLanguage((language) => (language === "en" ? "bn" : "en"))}
                  aria-label={translate("Preview language: {language}. Switch", { language: previewLanguage === "en" ? "English" : "বাংলা" })}
                  className="uppercase underline decoration-dotted underline-offset-3 hover:text-ink"
                >
                  {previewLanguage === "en" ? "English" : <span lang="bn" className="font-bn">বাংলা</span>}
                </button>
              </span>
              <AnnouncementPreview
                size="sm"
                type={values.type}
                title={titleBn ? values.titleBn : values.title}
                body={bodyBn ? values.bodyBn : values.body}
                titleLang={titleBn ? "bn" : undefined}
                bodyLang={bodyBn ? "bn" : undefined}
              />
              {reachText && <span className="text-caption text-ink-muted">{reachText}</span>}
            </div>
          );
        }}
      </form.Subscribe>
      <form.Subscribe selector={(state) => state.values.startAt}>
        {(startAt) => (
          <FormDialogFooter
            pinned
            isPending={isPending}
            submitLabel={submitLabel(announcement, startAt)}
            pendingLabel="Saving..."
            extra={
              announcement && (
                <Button
                  variant="ghost"
                  disabled={toggle.isPending || isPending}
                  className={announcement.isActive ? "px-3 text-expense hover:text-expense" : "px-3 text-emerald"}
                  onClick={() => void toggle.run(!announcement.isActive)}
                >
                  {translate(announcement.isActive ? "Turn off" : "Turn on")}
                </Button>
              )
            }
          />
        )}
      </form.Subscribe>
    </AppForm>
  );
};

export default AnnouncementForm;
