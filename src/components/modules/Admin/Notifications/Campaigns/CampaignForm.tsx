"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { useMemo, useState } from "react";
import { createCampaignAction } from "@/app/(dashboardLayout)/admin/notifications/campaigns/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSelectField from "@/components/shared/form/AppSelectField";
import Button from "@/components/smartly/Button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatRelativeDateTime, toDateTimeInputValue } from "@/lib/date";
import { firstZodError } from "@/lib/formValidators";
import { formatCount } from "@/lib/i18n/digits";
import { queryKeys } from "@/lib/queryKeys";
import { campaignAudienceQuery, notificationTemplatesQuery } from "@/queries/notification.queries";
import { plansQuery } from "@/queries/plan.queries";
import { NOTIFICATION_CHANNELS, type AudienceUserStatus, type NotificationChannel } from "@/types/notification.types";
import { ANY_PLAN, ANY_STATUS, campaignFormZodSchema, getScheduleInPastError, type ICampaignFormValues } from "@/zod/notification.validation";
import { CHANNEL_META } from "../notificationOptions";
import { buildPlanOptions, buildTemplateOptions, USER_STATUS_OPTIONS } from "./campaignOptions";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const { shape } = campaignFormZodSchema;

export const NEW_CAMPAIGN_DEFAULTS: ICampaignFormValues = {
  title: "",
  templateKey: "",
  channel: "EMAIL",
  planId: ANY_PLAN,
  userStatus: ANY_STATUS,
  scheduledFor: "",
};

type When = "now" | "later";
type SubmitMode = When | "draft";

const isChannel = (value: string): value is NotificationChannel => (NOTIFICATION_CHANNELS as readonly string[]).includes(value);

// A choice drawn as a card with a radio dot, a name and a line under it,
// in a radio group: one tab stop, the arrow keys move the choice.
const ChoiceCard = ({ value, title, sub }: { value: string; title: string; sub: string }) => (
  <RadioGroup.Item
    value={value}
    className="group flex flex-col gap-0.5 rounded-md border border-line bg-surface px-3 py-3 text-left transition-colors data-[state=checked]:border-emerald data-[state=checked]:bg-mint-50 data-[state=unchecked]:hover:bg-hover"
  >
    <span className="flex items-center gap-2">
      <span className="flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-line-strong group-data-[state=checked]:border-emerald" aria-hidden="true">
        <span className="size-1.5 rounded-full bg-emerald opacity-0 group-data-[state=checked]:opacity-100" />
      </span>
      <b className="text-body font-semibold text-ink">
        <T>{title}</T>
      </b>
    </span>
    <span className="pl-6 text-caption text-ink-muted">
      <T>{sub}</T>
    </span>
  </RadioGroup.Item>
);

interface CampaignFormProps {
  // A draft's name, message, channel and audience, when the campaign starts
  // from one; absent starts empty.
  defaultValues?: ICampaignFormValues;
  // Why the audience below isn't the draft's own, when it can't be.
  audienceNote?: string;
  onDone: () => void;
}

// The design's campaign drawer: a name for admins, the message, how it is
// sent, who gets it with how many that is, and when. Mounted inside the
// drawer, so each open starts from defaultValues. "Later" needs a date;
// only "Save as draft" saves one without.
const CampaignForm = ({ defaultValues = NEW_CAMPAIGN_DEFAULTS, audienceNote, onDone }: CampaignFormProps) => {
  const templates = useQuery(notificationTemplatesQuery()).data?.data;
  const plans = useQuery(plansQuery()).data?.data;
  const templateOptions = useMemo(() => buildTemplateOptions(templates ?? []), [templates]);
  const { locale, translate } = useLocale();
  const planOptions = useMemo(() => buildPlanOptions(plans ?? [], translate), [plans, translate]);
  const [when, setWhen] = useState<When>("later");

  const { run, isPending } = useActionMutation({
    action: createCampaignAction,
    successMessage: (campaign) => translate(campaign.status === "SCHEDULED" ? "{title} scheduled" : "{title} saved as a draft", { title: campaign.title }),
    invalidateKeys: [queryKeys.campaigns.all],
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues,
    onSubmitMeta: { mode: "later" } as { mode: SubmitMode },
    onSubmit: async ({ value, meta, formApi }) => {
      // "Schedule campaign" with no date would quietly save a draft.
      if (meta.mode === "later" && !value.scheduledFor) {
        formApi.setFieldMeta("scheduledFor", (fieldMeta) => ({ ...fieldMeta, errorMap: { ...fieldMeta.errorMap, onSubmit: "Pick a date and time" } }));
        return;
      }
      if (await run(value)) {
        onDone();
      }
    },
  });

  // "Send now" means a couple of minutes from now; a draft has no time.
  const submitAs = (mode: SubmitMode) => {
    if (mode === "draft") form.setFieldValue("scheduledFor", "");
    if (mode === "now") form.setFieldValue("scheduledFor", toDateTimeInputValue(new Date(Date.now() + 2 * 60_000)));
    void form.handleSubmit({ mode });
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
            <span className="text-small font-semibold text-ink-2"><T>Send by</T></span>
            <RadioGroup.Root
              value={field.state.value}
              onValueChange={(value) => {
                if (isChannel(value)) field.handleChange(value);
              }}
              aria-label={translate("Channel")}
              className="grid gap-2 sm:grid-cols-3"
            >
              {NOTIFICATION_CHANNELS.map((channel) => (
                <ChoiceCard key={channel} value={channel} title={CHANNEL_META[channel].label} sub={CHANNEL_META[channel].note} />
              ))}
            </RadioGroup.Root>
            <form.Subscribe selector={(state) => state.values.templateKey}>
              {(templateKey) => <ChannelMismatch template={templates?.find((item) => item.key === templateKey)} picked={field.state.value} />}
            </form.Subscribe>
          </div>
        )}
      </form.Field>
      <div className="flex flex-col gap-2">
        {audienceNote && (
          <p className="flex items-start gap-2 text-small text-warning">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {audienceNote}
          </p>
        )}
        <span className="text-small font-semibold text-ink-2"><T>Who gets it</T></span>
        <div className="grid gap-3 sm:grid-cols-2">
          <form.Field name="planId" validators={{ onChange: shape.planId }}>
            {(field) => <AppSelectField field={field} label={<span className="sr-only"><T>Plan</T></span>} options={planOptions} />}
          </form.Field>
          <form.Field name="userStatus" validators={{ onChange: shape.userStatus }}>
            {(field) => <AppSelectField field={field} label={<span className="sr-only"><T>Account status</T></span>} options={USER_STATUS_OPTIONS} />}
          </form.Field>
        </div>
        <form.Subscribe selector={(state) => [state.values.planId, state.values.userStatus] as const}>
          {([planId, userStatus]) => (
            <AudienceLine planId={planId === ANY_PLAN ? undefined : planId} status={userStatus === ANY_STATUS ? undefined : (userStatus as AudienceUserStatus)} />
          )}
        </form.Subscribe>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-small font-semibold text-ink-2"><T>When</T></span>
        <form.Subscribe selector={(state) => state.values.scheduledFor}>
          {(scheduledFor) => (
            <RadioGroup.Root
              value={when}
              onValueChange={(value) => {
                if (value === "now" || value === "later") setWhen(value);
              }}
              aria-label={translate("When")}
              className="grid gap-2 sm:grid-cols-2"
            >
              <ChoiceCard value="now" title="Send now" sub="Starts in about 2 minutes" />
              <ChoiceCard value="later" title="Later" sub={scheduledFor ? formatRelativeDateTime(scheduledFor, { t: translate, locale }) : "Pick a date and time"} />
            </RadioGroup.Root>
          )}
        </form.Subscribe>
        {when === "later" && (
          <form.Field name="scheduledFor" validators={{ onChange: ({ value }) => firstZodError(shape.scheduledFor, value) ?? getScheduleInPastError(value) }}>
            {(field) => <AppField field={field} label={<span className="sr-only"><T>Date and time</T></span>} type="datetime-local" />}
          </form.Field>
        )}
      </div>
      <p className="text-caption text-ink-muted">
        <T>A draft can&apos;t be edited yet. To change one later, start a new campaign from it.</T>
      </p>
      <FormDialogFooter
        pinned
        isPending={isPending}
        submitLabel={when === "now" ? "Send now" : "Schedule campaign"}
        pendingLabel="Saving..."
        extra={
          <Button variant="secondary" size="md" disabled={isPending} onClick={() => submitAs("draft")}>
            <T>Save as draft</T>
          </Button>
        }
      />
    </AppForm>
  );
};

// A message written for one channel, sent by another, may not read right:
// an email's subject is left out of an SMS, and long text splits.
const ChannelMismatch = ({ template, picked }: { template?: { key: string; channel: NotificationChannel }; picked: NotificationChannel }) => {
  const { translate } = useLocale();
  if (!template || template.channel === picked) return null;
  const values = { template: template.key, written: translate(CHANNEL_META[template.channel].label), picked: translate(CHANNEL_META[picked].label) };
  return (
    <p className="flex items-start gap-2 text-small text-warning">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      {picked === "SMS"
        ? translate("{template} is written for {written}. As an SMS its subject is left out, and long text goes as several paid messages.", values)
        : translate("{template} is written for {written}, not {picked}. Check that it reads right.", values)}
    </p>
  );
};

// "About 612 people match right now."
const AudienceLine = ({ planId, status }: { planId?: string; status?: AudienceUserStatus }) => {
  const query = useQuery(campaignAudienceQuery({ planId, status }));
  const count = query.data?.data.count;
  const { locale, translate } = useLocale();

  // A count that failed says so, rather than "Counting..." for ever.
  if (count === undefined && query.isError) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-strip px-3 py-3 text-body text-ink-2">
        <span className="grow">{translate("Couldn't count who matches.")}</span>
        <Button variant="link" size="sm" onClick={() => void query.refetch()}>
          {translate("Try again")}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-mint-200 bg-mint-50 px-3 py-3 text-body text-forest">
      {count === undefined ? (
        <T>Counting who matches...</T>
      ) : (
        <T
          values={{
            people: (
              <b className="font-semibold">
                <T values={{ count: formatCount(count, locale) }}>{"{count} people"}</T>
              </b>
            ),
          }}
        >
          {"About {people} match right now."}
        </T>
      )}
    </div>
  );
};

export default CampaignForm;
