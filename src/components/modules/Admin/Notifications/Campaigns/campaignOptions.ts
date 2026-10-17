import { inEnglish, type Translate } from "@/lib/i18n/message";
import { humanizeEnum } from "@/lib/statusBadge";
import { AUDIENCE_USER_STATUSES, type ICampaignTargetFilter, type INotificationTemplate } from "@/types/notification.types";
import { ANY_PLAN, ANY_STATUS } from "@/zod/notification.validation";

export const USER_STATUS_OPTIONS = [{ value: ANY_STATUS, label: "Any account" }, ...AUDIENCE_USER_STATUSES.map((value) => ({ value, label: `${humanizeEnum(value)} accounts` }))];

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
