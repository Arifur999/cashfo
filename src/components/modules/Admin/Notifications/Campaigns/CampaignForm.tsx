"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Plus, UserRound, X } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { useMemo, useState } from "react";
import { createAndSendCampaignAction, createCampaignAction } from "@/app/(dashboardLayout)/admin/notifications/campaigns/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSelectField from "@/components/shared/form/AppSelectField";
import SelectControl from "@/components/shared/form/SelectControl";
import Button from "@/components/smartly/Button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatRelativeDateTime } from "@/lib/date";
import { firstZodError } from "@/lib/formValidators";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { campaignAudienceQuery, notificationTemplatesQuery } from "@/queries/notification.queries";
import { plansQuery } from "@/queries/plan.queries";
import { NOTIFICATION_CHANNELS, type AudienceUserStatus, type CampaignLanguage, type ICampaign, type NotificationChannel } from "@/types/notification.types";
import { ANY_LANGUAGE, ANY_PLAN, ANY_STATUS, ANY_TIME, campaignFormZodSchema, getScheduleInPastError, type ICampaignFormValues } from "@/zod/notification.validation";
import { CHANNEL_META } from "../notificationOptions";
import { AUDIENCE_RULES, type AudienceRule, buildPlanOptions, buildTemplateOptions, initialRules, LANGUAGE_OPTIONS, LAST_ACTIVE_OPTIONS, USER_STATUS_OPTIONS } from "./campaignOptions";
import T from "@/components/shared/T";

const { shape } = campaignFormZodSchema;

export const NEW_CAMPAIGN_DEFAULTS: ICampaignFormValues = {
  title: "",
  templateKey: "",
  channel: "EMAIL",
  planId: ANY_PLAN,
  userStatus: ANY_STATUS,
  lastActiveDays: ANY_TIME,
  language: ANY_LANGUAGE,
  scheduledFor: "",
};

type When = "now" | "later";
type SubmitMode = When | "draft";

const isChannel = (value: string): value is NotificationChannel => (NOTIFICATION_CHANNELS as readonly string[]).includes(value);

// A choice drawn as the board's card: a radio dot, a name and a line
// under it, in a radio group (one tab stop, the arrow keys move the choice).
const ChoiceCard = ({ value, title, sub, disabled = false }: { value: string; title: string; sub: string; disabled?: boolean }) => (
  <RadioGroup.Item
    value={value}
    disabled={disabled}
    className="group flex flex-col gap-0.5 rounded-field border border-line bg-surface px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 data-[state=checked]:border-[1.5px] data-[state=checked]:border-emerald data-[state=checked]:bg-mint-50 data-[state=unchecked]:enabled:hover:bg-hover"
  >
    <span className="flex items-center gap-2">
      <span className="flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line-strong bg-surface group-data-[state=checked]:border-2 group-data-[state=checked]:border-emerald" aria-hidden="true">
        <span className="size-1.5 rounded-full bg-emerald opacity-0 group-data-[state=checked]:opacity-100" />
      </span>
      <b className="text-body font-semibold text-ink">
        <T>{title}</T>
      </b>
    </span>
    <span className="pl-6 text-caption leading-[1.3] text-ink-muted">
      <T>{sub}</T>
    </span>
  </RadioGroup.Item>
);

// The rule rows' selects: 36px, the field edge.
const RULE_SELECT = "h-9 border-input text-small text-ink";

interface CampaignFormProps {
  // A draft's name, message, channel and audience, when the campaign starts
  // from one; absent starts empty.
  defaultValues?: ICampaignFormValues;
  // Why the audience below isn't the draft's own, when it can't be.
  audienceNote?: string;
  onDone: () => void;
}

// The board's campaign drawer: a name for admins, the message, how it is
// sent, who gets it as rules (plan, last active, language, account) with
// how many people match, and when. "Send now" makes the campaign and sends
// it at once; "Later" needs a date; "Save as draft" saves one without.
const CampaignForm = ({ defaultValues = NEW_CAMPAIGN_DEFAULTS, audienceNote, onDone }: CampaignFormProps) => {
  const templates = useQuery(notificationTemplatesQuery()).data?.data;
  const plans = useQuery(plansQuery()).data?.data;
  const templateOptions = useMemo(() => buildTemplateOptions(templates ?? []), [templates]);
  const { locale, translate } = useLocale();
  const planOptions = useMemo(() => buildPlanOptions(plans ?? [], translate), [plans, translate]);
  const [when, setWhen] = useState<When>("later");
  const [rules, setRules] = useState<AudienceRule[]>(() => initialRules(defaultValues));

  const create = useActionMutation({
    action: createCampaignAction,
    successMessage: (campaign) => translate(campaign.status === "SCHEDULED" ? "{title} scheduled" : "{title} saved as a draft", { title: campaign.title }),
    invalidateKeys: [queryKeys.campaigns.all, queryKeys.notificationLogs.all],
    refreshRoute: false,
  });
  const sendNow = useActionMutation({
    action: createAndSendCampaignAction,
    successMessage: (campaign: ICampaign) =>
      campaign.status === "SENT"
        ? plural(translate, campaign.sentCount, "{title} sent to {count} person", "{title} sent to {count} people", { title: campaign.title, count: formatCount(campaign.sentCount, locale) })
        : translate("{title} is sending", { title: campaign.title }),
    invalidateKeys: [queryKeys.campaigns.all, queryKeys.notificationLogs.all],
    refreshRoute: false,
  });
  const isPending = create.isPending || sendNow.isPending;

  const form = useForm({
    defaultValues,
    onSubmitMeta: { mode: "later" } as { mode: SubmitMode },
    onSubmit: async ({ value, meta, formApi }) => {
      // "Schedule campaign" with no date would quietly save a draft.
      if (meta.mode === "later" && !value.scheduledFor) {
        formApi.setFieldMeta("scheduledFor", (fieldMeta) => ({ ...fieldMeta, errorMap: { ...fieldMeta.errorMap, onSubmit: "Pick a date and time" } }));
        return;
      }
      const ok = meta.mode === "now" ? await sendNow.run({ ...value, scheduledFor: "" }) : await create.run(value);
      if (ok) onDone();
    },
  });

  // A draft has no time.
  const submitAs = (mode: SubmitMode) => {
    if (mode === "draft") form.setFieldValue("scheduledFor", "");
    void form.handleSubmit({ mode });
  };

  // A rule taken away stops narrowing: its value goes back to "any".
  const removeRule = (rule: AudienceRule) => {
    form.setFieldValue(AUDIENCE_RULES[rule].field, AUDIENCE_RULES[rule].any);
    setRules((current) => current.filter((item) => item !== rule));
  };
  const swapRule = (from: AudienceRule, to: AudienceRule) => {
    form.setFieldValue(AUDIENCE_RULES[from].field, AUDIENCE_RULES[from].any);
    setRules((current) => current.map((item) => (item === from ? to : item)));
  };
  const unused = (Object.keys(AUDIENCE_RULES) as AudienceRule[]).filter((rule) => !rules.includes(rule));
  const valueOptions: Record<AudienceRule, readonly { value: string; label: string }[]> = {
    plan: planOptions,
    // "30 days" in the reader's words and digits.
    lastActive: LAST_ACTIVE_OPTIONS.map((option) =>
      option.value === ANY_TIME ? option : { value: option.value, label: plural(translate, Number(option.value), "{count} day", "{count} days", { count: formatCount(Number(option.value), locale) }) },
    ),
    language: LANGUAGE_OPTIONS,
    status: USER_STATUS_OPTIONS,
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
            <span className="text-body font-medium text-ink">
              <T>Send by</T>
            </span>
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
        <span className="text-body font-medium text-ink">
          <T>Who gets it</T>
        </span>
        {audienceNote && (
          <p className="flex items-start gap-2 text-small text-warning">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {audienceNote}
          </p>
        )}
        {rules.map((rule) => {
          const { field: name, operator, label } = AUDIENCE_RULES[rule];
          return (
            <div key={rule} className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)_minmax(0,1.25fr)_auto] items-center gap-2">
              <SelectControl
                ariaLabel="Rule"
                value={rule}
                options={[rule, ...unused].map((kind) => ({ value: kind, label: AUDIENCE_RULES[kind].label }))}
                onValueChange={(next) => next !== rule && swapRule(rule, next)}
                size="sm"
                className={RULE_SELECT}
              />
              <SelectControl ariaLabel="Condition" value={operator} options={[{ value: operator, label: `${operator}@@rule` }]} onValueChange={() => undefined} size="sm" className={RULE_SELECT} />
              <form.Field name={name}>
                {(field) => <SelectControl ariaLabel={label} value={field.state.value} options={valueOptions[rule]} onValueChange={(value) => field.handleChange(value)} size="sm" className={RULE_SELECT} />}
              </form.Field>
              <Button variant="ghost" size="icon-xs" className="text-ink-muted hover:text-ink" aria-label={translate("Remove the {rule} rule", { rule: translate(label) })} onClick={() => removeRule(rule)}>
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
          );
        })}
        {unused.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="inline-flex items-center gap-1.5 self-start text-small font-semibold text-emerald hover:underline pointer-coarse:min-h-11">
                <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                {translate("Add a rule")}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {unused.map((rule) => (
                <DropdownMenuItem key={rule} onSelect={() => setRules((current) => [...current, rule])}>
                  {translate(AUDIENCE_RULES[rule].label)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <form.Subscribe selector={(state) => [state.values.planId, state.values.userStatus, state.values.lastActiveDays, state.values.language] as const}>
          {([planId, userStatus, lastActiveDays, language]) => (
            <AudienceLine
              planId={planId === ANY_PLAN ? undefined : planId}
              status={userStatus === ANY_STATUS ? undefined : (userStatus as AudienceUserStatus)}
              lastActiveWithinDays={lastActiveDays === ANY_TIME ? undefined : Number(lastActiveDays)}
              language={language === ANY_LANGUAGE ? undefined : (language as CampaignLanguage)}
            />
          )}
        </form.Subscribe>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-body font-medium text-ink">
          <T>When</T>
        </span>
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
              <ChoiceCard value="now" title="Send now" sub="Starts in a minute" />
              <ChoiceCard value="later" title="Later" sub={scheduledFor ? formatRelativeDateTime(scheduledFor, { t: translate, locale }) : "Pick a date and time"} />
            </RadioGroup.Root>
          )}
        </form.Subscribe>
        {when === "later" && (
          <form.Field name="scheduledFor" validators={{ onChange: ({ value }) => firstZodError(shape.scheduledFor, value) ?? getScheduleInPastError(value) }}>
            {(field) => (
              <AppField
                field={field}
                label={
                  <span className="sr-only">
                    <T>Date and time</T>
                  </span>
                }
                type="datetime-local"
              />
            )}
          </form.Field>
        )}
      </div>
      <FormDialogFooter
        pinned
        isPending={isPending}
        submitLabel={when === "now" ? "Send now" : "Schedule campaign"}
        pendingLabel={when === "now" ? "Sending..." : "Saving..."}
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
// an email's subject is left out of an in-app message.
const ChannelMismatch = ({ template, picked }: { template?: { key: string; channel: NotificationChannel }; picked: NotificationChannel }) => {
  const { translate } = useLocale();
  if (!template || template.channel === picked) return null;
  const values = { template: template.key, written: translate(CHANNEL_META[template.channel].label), picked: translate(CHANNEL_META[picked].label) };
  return (
    <p className="flex items-start gap-2 text-small text-warning">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      {translate("{template} is written for {written}, not {picked}. Check that it reads right.", values)}
    </p>
  );
};

interface AudienceLineProps {
  planId?: string;
  status?: AudienceUserStatus;
  lastActiveWithinDays?: number;
  language?: CampaignLanguage;
}

// "About 612 people match right now.", and how many of them a send reaches
// when some can't get it (accounts that aren't active).
const AudienceLine = (filter: AudienceLineProps) => {
  const query = useQuery(campaignAudienceQuery(filter));
  const audience = query.data?.data;
  const { locale, translate } = useLocale();

  // A count that failed says so, rather than "Counting..." for ever.
  if (!audience && query.isError) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-field border border-line bg-strip px-3 py-2.5 text-body text-ink-2">
        <span className="grow">{translate("Couldn't count who matches.")}</span>
        <Button variant="link" size="sm" onClick={() => void query.refetch()}>
          {translate("Try again")}
        </Button>
      </div>
    );
  }

  const short = audience?.reachable !== undefined && audience.reachable < audience.count;
  return (
    <div className="flex flex-col gap-0.5 rounded-field border border-mint-200 bg-emerald-soft px-3 py-2.5 text-body text-forest">
      <span className="flex items-center gap-2.5">
        <UserRound className="size-4 shrink-0 text-emerald" aria-hidden="true" />
        {!audience ? (
          <T>Counting who matches...</T>
        ) : (
          <span>
            <T
              values={{
                people: (
                  <b className={cn("font-semibold")}>
                    {plural(translate, audience.count, "{count} person", "{count} people", { count: formatCount(audience.count, locale) })}
                  </b>
                ),
              }}
            >
              {"About {people} match right now."}
            </T>
          </span>
        )}
      </span>
      {short && (
        <span className="pl-6.5 text-caption text-ink-muted">
          {translate("{count} of them can get it: the rest aren't active accounts.", { count: formatCount(audience.reachable ?? 0, locale) })}
        </span>
      )}
    </div>
  );
};

export default CampaignForm;
