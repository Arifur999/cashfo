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
import { firstZodError } from "@/lib/formValidators";
import { queryKeys } from "@/lib/queryKeys";
import { plansQuery } from "@/queries/plan.queries";
import type { IAnnouncement } from "@/types/announcement.types";
import { announcementFormZodSchema, getScheduleError, type IAnnouncementFormValues } from "@/zod/announcement.validation";
import { ANNOUNCEMENT_TYPE_OPTIONS, buildAudienceOptions } from "./announcementOptions";
import AnnouncementPreview from "./AnnouncementPreview";

const { shape } = announcementFormZodSchema;

interface AnnouncementFormProps {
  defaultValues: IAnnouncementFormValues;
  // Editing this announcement; absent means creating one.
  announcement?: IAnnouncement;
  onDone: () => void;
}

// Mounted inside the dialog content, so each open starts from defaultValues.
const AnnouncementForm = ({ defaultValues, announcement, onDone }: AnnouncementFormProps) => {
  const { data: plansResponse } = useQuery(plansQuery());
  const audienceOptions = useMemo(() => buildAudienceOptions(plansResponse?.data ?? []), [plansResponse]);

  const { run, isPending } = useActionMutation({
    action: (values: IAnnouncementFormValues) =>
      announcement ? updateAnnouncementAction(announcement.id, values) : createAnnouncementAction(values),
    successMessage: announcement ? "Announcement updated" : "Announcement created",
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

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <form.Field name="title" validators={{ onChange: shape.title }}>
          {(field) => <AppField field={field} label="Title (English)" />}
        </form.Field>
        <form.Field name="titleBn" validators={{ onChange: shape.titleBn }}>
          {(field) => <AppField field={field} label="Title (Bangla)" description="Optional." />}
        </form.Field>
        <form.Field name="body" validators={{ onChange: shape.body }}>
          {(field) => <AppTextareaField field={field} label="Message (English)" rows={3} />}
        </form.Field>
        <form.Field name="bodyBn" validators={{ onChange: shape.bodyBn }}>
          {(field) => <AppTextareaField field={field} label="Message (Bangla)" rows={3} description="Optional." />}
        </form.Field>
        <form.Field name="type" validators={{ onChange: shape.type }}>
          {(field) => <AppSelectField field={field} label="Type" options={ANNOUNCEMENT_TYPE_OPTIONS} />}
        </form.Field>
        <form.Field name="targetPlan" validators={{ onChange: shape.targetPlan }}>
          {(field) => <AppSelectField field={field} label="Audience" options={audienceOptions} />}
        </form.Field>
        <form.Field name="startAt" validators={{ onChange: shape.startAt }}>
          {(field) => <AppField field={field} label="Starts" type="datetime-local" description="Bangladesh time." />}
        </form.Field>
        <form.Field
          name="endAt"
          validators={{
            onChangeListenTo: ["startAt"],
            onChange: ({ value, fieldApi }) => firstZodError(shape.endAt, value) ?? getScheduleError(fieldApi.form.getFieldValue("startAt"), value),
          }}
        >
          {(field) => <AppField field={field} label="Ends" type="datetime-local" description="Optional -- leave empty to keep it up." />}
        </form.Field>
      </div>
      <form.Subscribe selector={(state) => state.values}>
        {(values) => <AnnouncementPreview type={values.type} title={values.title} body={values.body} />}
      </form.Subscribe>
      <FormDialogFooter isPending={isPending} submitLabel={announcement ? "Save changes" : "Publish"} pendingLabel="Saving..." />
    </AppForm>
  );
};

export default AnnouncementForm;
