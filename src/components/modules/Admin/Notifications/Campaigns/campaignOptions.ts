import { inEnglish, type Translate } from "@/lib/i18n/message";
import { humanizeEnum } from "@/lib/statusBadge";
import type { AudienceUserStatus, ICampaign, ICampaignTargetFilter, INotificationTemplate } from "@/types/notification.types";
import { ANY_PLAN, ANY_STATUS, type ICampaignFormValues } from "@/zod/notification.validation";

// The statuses a new campaign can target. A customer account is active,
// suspended or deleted; the API reads the older "banned" and "pending
// deletion" choices as deleted accounts, so they aren't offered (old
// campaigns that used them still read right, through describeAudience).
export const TARGETABLE_USER_STATUSES = ["ACTIVE", "SUSPENDED"] as const satisfies readonly AudienceUserStatus[];

export const USER_STATUS_OPTIONS = [{ value: ANY_STATUS, label: "Any account" }, ...TARGETABLE_USER_STATUSES.map((value) => ({ value, label: `${humanizeEnum(value)} accounts` }))];

export const buildPlanOptions = (plans: { id: string; name: string }[], t: Translate = inEnglish) => [
  { value: ANY_PLAN, label: "Any plan" },
  ...plans.map((plan) => ({ value: plan.id, label: t("{name} plan", { name: plan.name }) })),
];

// Only active templates can be sent; each shows its key and its subject.
export const buildTemplateOptions = (templates: INotificationTemplate[]) =>
  templates.filter((template) => template.isActive).map((template) => ({ value: template.key, label: template.subjectEn ? `${template.key} · "${template.subjectEn}"` : template.key }));

// { planId, status } -> "Free plan, active", "Everyone", "Suspended accounts".
export const describeAudience = (filter: ICampaignTargetFilter, planNames: Map<string, string>, t: Translate = inEnglish) => {
  const plan = filter.planId ? (planNames.has(filter.planId) ? t("{name} plan", { name: planNames.get(filter.planId) ?? "" }) : t("A removed plan")) : null;
  const status = filter.status ? t(humanizeEnum(filter.status)).toLowerCase() : null;
  if (plan && status) return t("{plan}, {status}", { plan, status });
  if (plan) return plan;
  if (status) return t("Everyone {status}", { status });
  return t("Everyone");
};

// Nothing sends scheduled campaigns yet, so one whose time has passed is
// still "scheduled": the list says it is due and hasn't gone.
export const isPastDue = (campaign: Pick<ICampaign, "status" | "scheduledFor">, now: Date = new Date()) =>
  campaign.status === "SCHEDULED" && campaign.scheduledFor !== null && new Date(campaign.scheduledFor).getTime() <= now.getTime();

// A draft's audience status the form no longer offers (banned, pending
// deletion), which a new campaign from it can't keep; null when it can.
export const droppedUserStatus = (campaign: Pick<ICampaign, "targetFilter">): AudienceUserStatus | null => {
  const status = campaign.targetFilter.status;
  return status && !(TARGETABLE_USER_STATUSES as readonly string[]).includes(status) ? status : null;
};

// A draft can't be edited yet, so it can start a new campaign: the same
// name, message, channel and audience, with no time picked. A template
// switched off since is left unpicked (only active ones can be sent), and an
// old status falls back to any account, which the drawer points out.
export const campaignToFormValues = (campaign: ICampaign, templates: INotificationTemplate[]): ICampaignFormValues => ({
  title: campaign.title,
  templateKey: templates.some((template) => template.key === campaign.templateKey && template.isActive) ? campaign.templateKey : "",
  channel: campaign.channel,
  planId: campaign.targetFilter.planId ?? ANY_PLAN,
  userStatus: campaign.targetFilter.status && !droppedUserStatus(campaign) ? campaign.targetFilter.status : ANY_STATUS,
  scheduledFor: "",
});
