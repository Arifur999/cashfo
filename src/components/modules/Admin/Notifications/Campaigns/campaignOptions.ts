import { inEnglish, type Translate } from "@/lib/i18n/message";
import { humanizeEnum } from "@/lib/statusBadge";
import type { AudienceUserStatus, ICampaign, ICampaignTargetFilter, INotificationTemplate } from "@/types/notification.types";
import { ANY_LANGUAGE, ANY_PLAN, ANY_STATUS, ANY_TIME, type ICampaignFormValues } from "@/zod/notification.validation";

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

// The drawer's "Who gets it" rules: the field each one sets, the word
// between (the board's "is" / "within") and its "no rule" value.
export const AUDIENCE_RULES = {
  plan: { label: "Plan", operator: "is", field: "planId", any: ANY_PLAN },
  lastActive: { label: "Last active", operator: "within", field: "lastActiveDays", any: ANY_TIME },
  language: { label: "Language", operator: "is", field: "language", any: ANY_LANGUAGE },
  status: { label: "Account", operator: "is", field: "userStatus", any: ANY_STATUS },
} as const satisfies Record<string, { label: string; operator: string; field: keyof ICampaignFormValues; any: string }>;

export type AudienceRule = keyof typeof AUDIENCE_RULES;

// The rows a campaign opens with: plan, last active and language, as the
// board draws them, plus the account rule when a draft used it.
export const initialRules = (values: Pick<ICampaignFormValues, "userStatus">): AudienceRule[] => [
  "plan",
  "lastActive",
  "language",
  ...(values.userStatus !== ANY_STATUS ? (["status"] as const) : []),
];

export const LAST_ACTIVE_OPTIONS = [
  { value: ANY_TIME, label: "Any time" },
  ...[1, 7, 14, 30, 60, 90, 180, 365].map((days) => ({ value: String(days), label: days === 1 ? "1 day" : `${days} days` })),
];

export const LANGUAGE_OPTIONS = [
  { value: ANY_LANGUAGE, label: "Any" },
  { value: "EN", label: "English" },
  { value: "BN", label: "Bangla" },
];

// Only active templates can be sent; each shows its key and its subject.
export const buildTemplateOptions = (templates: INotificationTemplate[]) =>
  templates.filter((template) => template.isActive).map((template) => ({ value: template.key, label: template.subjectEn ? `${template.key} · "${template.subjectEn}"` : template.key }));

// { planId, status } -> "Free plan, active", "Everyone", "Suspended accounts",
// then when they were last active and their language: "Free plan, active
// in the last 30 days, Bangla".
export const describeAudience = (filter: ICampaignTargetFilter, planNames: Map<string, string>, t: Translate = inEnglish) => {
  const plan = filter.planId ? (planNames.has(filter.planId) ? t("{name} plan", { name: planNames.get(filter.planId) ?? "" }) : t("A removed plan")) : null;
  const status = filter.status ? t(humanizeEnum(filter.status)).toLowerCase() : null;
  const base = plan && status ? t("{plan}, {status}", { plan, status }) : plan ? plan : status ? t("Everyone {status}", { status }) : t("Everyone");
  const extras = [
    ...(filter.lastActiveWithinDays ? [filter.lastActiveWithinDays === 1 ? t("active in the last day") : t("active in the last {days} days", { days: filter.lastActiveWithinDays })] : []),
    ...(filter.language ? [t(filter.language === "BN" ? "Bangla" : "English")] : []),
  ];
  return [base, ...extras].join(", ");
};

// A scheduled campaign goes out on the server's timer once its time comes;
// one still "scheduled" after it couldn't go (its template was switched off,
// email isn't set up), and the list says it is due and hasn't gone.
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
  lastActiveDays: campaign.targetFilter.lastActiveWithinDays ? String(campaign.targetFilter.lastActiveWithinDays) : ANY_TIME,
  language: campaign.targetFilter.language ?? ANY_LANGUAGE,
  scheduledFor: "",
});
