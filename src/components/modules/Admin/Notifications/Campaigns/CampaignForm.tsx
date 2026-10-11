"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createCampaignAction } from "@/app/(dashboardLayout)/admin/notifications/campaigns/_action";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSelectField from "@/components/shared/form/AppSelectField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { firstZodError } from "@/lib/formValidators";
import { queryKeys } from "@/lib/queryKeys";
import { notificationTemplatesQuery } from "@/queries/notification.queries";
import { plansQuery } from "@/queries/plan.queries";
import { ANY_PLAN, ANY_STATUS, campaignFormZodSchema, getScheduleInPastError, type ICampaignFormValues } from "@/zod/notification.validation";
import { buildPlanOptions, buildTemplateOptions, USER_STATUS_OPTIONS } from "./campaignOptions";

const { shape } = campaignFormZodSchema;

const DEFAULT_VALUES: ICampaignFormValues = {
  title: "",
  templateKey: "",
  channel: "EMAIL",
  planId: ANY_PLAN,
  userStatus: ANY_STATUS,
  scheduledFor: "",
};

// Mounted inside the dialog content, so each open starts empty.
const CampaignForm = ({ onDone }: { onDone: () => void }) => {
  const { data: templatesResponse } = useQuery(notificationTemplatesQuery());
  const { data: plansResponse } = useQuery(plansQuery());
  const templates = useMemo(() => templatesResponse?.data ?? [], [templatesResponse]);
  const templateOptions = useMemo(() => buildTemplateOptions(templates), [templates]);
  const planOptions = useMemo(() => buildPlanOptions(plansResponse?.data ?? []), [plansResponse]);

  const { run, isPending } = useActionMutation({
    action: createCampaignAction,
    successMessage: (campaign) => (campaign.status === "SCHEDULED" ? `${campaign.title} scheduled` : `${campaign.title} saved as a draft`),
    invalidateKeys: [queryKeys.campaigns.all],
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      if (await run(value)) {
        onDone();
      }
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <form.Field name="title" validators={{ onChange: shape.title }}>
        {(field) => <AppField field={field} label="Title" placeholder="e.g. Eid offer reminder" description="For the team; users don't see it." />}
      </form.Field>
      <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
        <form.Field
          name="templateKey"
          validators={{ onChange: shape.templateKey }}
          listeners={{
            // The campaign goes out on the template's own channel.
            onChange: ({ value }) => {
              const template = templates.find((item) => item.key === value);
              if (template) form.setFieldValue("channel", template.channel);
            },
          }}
        >
          {(field) => <AppSelectField field={field} label="Template" options={templateOptions} placeholder="Choose a template" />}
        </form.Field>
        <form.Subscribe selector={(state) => [state.values.templateKey, state.values.channel] as const}>
          {([templateKey, channel]) => (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Channel</p>
              <div className="flex h-9 items-center">{templateKey ? <StatusBadgeCell status={channel} /> : <span className="text-sm text-muted-foreground">—</span>}</div>
            </div>
          )}
        </form.Subscribe>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <form.Field name="planId" validators={{ onChange: shape.planId }}>
          {(field) => <AppSelectField field={field} label="Plan" options={planOptions} />}
        </form.Field>
        <form.Field name="userStatus" validators={{ onChange: shape.userStatus }}>
          {(field) => <AppSelectField field={field} label="Account status" options={USER_STATUS_OPTIONS} />}
        </form.Field>
      </div>
      <form.Field
        name="scheduledFor"
        validators={{ onChange: ({ value }) => firstZodError(shape.scheduledFor, value) ?? getScheduleInPastError(value) }}
      >
        {(field) => (
          <AppField field={field} label="Schedule" type="datetime-local" description="Bangladesh time. Leave empty to save as a draft." />
        )}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel="Create campaign" pendingLabel="Creating..." />
    </AppForm>
  );
};

export default CampaignForm;
