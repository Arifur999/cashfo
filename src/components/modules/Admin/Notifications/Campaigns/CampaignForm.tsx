"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { createCampaignAction } from "@/app/(dashboardLayout)/admin/notifications/campaigns/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSelectField from "@/components/shared/form/AppSelectField";
import { Button } from "@/components/ui/button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatRelativeDateTime, toDateTimeInputValue } from "@/lib/date";
import { firstZodError } from "@/lib/formValidators";
import { formatNumber } from "@/lib/number";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { campaignAudienceQuery, notificationTemplatesQuery } from "@/queries/notification.queries";
import { plansQuery } from "@/queries/plan.queries";
import { NOTIFICATION_CHANNELS, type AudienceUserStatus, type NotificationChannel } from "@/types/notification.types";
import { ANY_PLAN, ANY_STATUS, campaignFormZodSchema, getScheduleInPastError, type ICampaignFormValues } from "@/zod/notification.validation";
import { CHANNEL_META } from "../notificationOptions";
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

type When = "now" | "later";

// A choice drawn as a card with a radio dot, a name and a line under it.
const ChoiceCard = <T extends string>({ value, on, title, sub, onPick }: { value: T; on: boolean; title: string; sub: string; onPick: (value: T) => void }) => (
  <button
    type="button"
    role="radio"
    aria-checked={on}
    onClick={() => onPick(value)}
    className={cn("flex flex-col gap-0.5 rounded-md border px-3 py-3 text-left transition-colors", on ? "border-emerald bg-mint-50" : "border-line bg-surface hover:bg-cream")}
  >
    <span className="flex items-center gap-2">
      <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border-2", on ? "border-emerald" : "border-line-strong")} aria-hidden="true">
        {on && <span className="size-1.5 rounded-full bg-emerald" />}
      </span>
      <b className="text-body font-semibold text-ink">{title}</b>
    </span>
    <span className="pl-6 text-caption text-ink-muted">{sub}</span>
  </button>
);

// The design's campaign drawer: a name for admins, the message, how it is
// sent, who gets it with how many that is, and when. Mounted inside the
// drawer, so each open starts empty.
const CampaignForm = ({ onDone }: { onDone: () => void }) => {
  const templates = useQuery(notificationTemplatesQuery()).data?.data;
  const plans = useQuery(plansQuery()).data?.data;
  const templateOptions = useMemo(() => buildTemplateOptions(templates ?? []), [templates]);
  const planOptions = useMemo(() => buildPlanOptions(plans ?? []), [plans]);
  const [when, setWhen] = useState<When>("later");

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

  // "Send now" means a couple of minutes from now; a draft has no time.
  const submitAs = (mode: When | "draft") => {
    if (mode === "draft") form.setFieldValue("scheduledFor", "");
    if (mode === "now") form.setFieldValue("scheduledFor", toDateTimeInputValue(new Date(Date.now() + 2 * 60_000)));
    void form.handleSubmit();
  };

  return (
    <AppForm onSubmit={() => submitAs(when)} className="flex flex-1 flex-col gap-4 space-y-0">
      <form.Field name="title" validators={{ onChange: shape.title }}>
        {(field) => <AppField field={field} label="Name" placeholder="Puja offer for Free users" description="Only admins see this name." />}
      </form.Field>
      <form.Field
        name="templateKey"
        validators={{ onChange: shape.templateKey }}
        listeners={{
          // The campaign goes out on the template's own channel, unless changed below.
          onChange: ({ value }) => {
            const template = templates?.find((item) => item.key === value);
            if (template) form.setFieldValue("channel", template.channel);
          },
        }}
      >
        {(field) => <AppSelectField field={field} label="Message" options={templateOptions} placeholder="Pick a template" />}
      </form.Field>
      <form.Field name="channel" validators={{ onChange: shape.channel }}>
        {(field) => (
          <div className="flex flex-col gap-2">
            <span className="text-small font-semibold text-ink-2">Send by</span>
            <div role="radiogroup" aria-label="Channel" className="grid gap-2 sm:grid-cols-3">
              {NOTIFICATION_CHANNELS.map((channel) => (
                <ChoiceCard<NotificationChannel>
                  key={channel}
                  value={channel}
                  on={field.state.value === channel}
                  title={CHANNEL_META[channel].label}
                  sub={CHANNEL_META[channel].note}
                  onPick={(value) => field.handleChange(value)}
                />
              ))}
            </div>
          </div>
        )}
      </form.Field>
      <div className="flex flex-col gap-2">
        <span className="text-small font-semibold text-ink-2">Who gets it</span>
        <div className="grid gap-3 sm:grid-cols-2">
          <form.Field name="planId" validators={{ onChange: shape.planId }}>
            {(field) => <AppSelectField field={field} label={<span className="sr-only">Plan</span>} options={planOptions} />}
          </form.Field>
          <form.Field name="userStatus" validators={{ onChange: shape.userStatus }}>
            {(field) => <AppSelectField field={field} label={<span className="sr-only">Account status</span>} options={USER_STATUS_OPTIONS} />}
          </form.Field>
        </div>
        <form.Subscribe selector={(state) => [state.values.planId, state.values.userStatus] as const}>
          {([planId, userStatus]) => (
            <AudienceLine planId={planId === ANY_PLAN ? undefined : planId} status={userStatus === ANY_STATUS ? undefined : (userStatus as AudienceUserStatus)} />
          )}
        </form.Subscribe>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-small font-semibold text-ink-2">When</span>
        <form.Subscribe selector={(state) => state.values.scheduledFor}>
          {(scheduledFor) => (
            <div role="radiogroup" aria-label="When" className="grid gap-2 sm:grid-cols-2">
              <ChoiceCard<When> value="now" on={when === "now"} title="Send now" sub="Starts in a minute" onPick={setWhen} />
              <ChoiceCard<When>
                value="later"
                on={when === "later"}
                title="Later"
                sub={scheduledFor ? formatRelativeDateTime(scheduledFor) : "Pick a date and time"}
                onPick={setWhen}
              />
            </div>
          )}
        </form.Subscribe>
        {when === "later" && (
          <form.Field name="scheduledFor" validators={{ onChange: ({ value }) => firstZodError(shape.scheduledFor, value) ?? getScheduleInPastError(value) }}>
            {(field) => <AppField field={field} label={<span className="sr-only">Date and time</span>} type="datetime-local" size="sm" />}
          </form.Field>
        )}
      </div>
      <FormDialogFooter
        pinned
        isPending={isPending}
        submitLabel={when === "now" ? "Send now" : "Schedule campaign"}
        pendingLabel="Saving..."
        extra={
          <Button type="button" variant="outline" disabled={isPending} className="h-10 border-line-strong bg-surface px-4 font-semibold text-ink hover:bg-surface-sunken" onClick={() => submitAs("draft")}>
            Save as draft
          </Button>
        }
      />
    </AppForm>
  );
};

// "About 612 people match right now."
const AudienceLine = ({ planId, status }: { planId?: string; status?: AudienceUserStatus }) => {
  const count = useQuery(campaignAudienceQuery({ planId, status })).data?.data.count;
  return (
    <div className="rounded-md border border-mint-200 bg-mint-50 px-3 py-3 text-body text-forest">
      {count === undefined ? (
        "Counting who matches..."
      ) : (
        <>
          About <b className="font-semibold">{formatNumber(count)} people</b> match right now.
        </>
      )}
    </div>
  );
};

export default CampaignForm;
