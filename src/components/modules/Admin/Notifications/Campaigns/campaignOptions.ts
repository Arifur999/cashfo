import type { DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import { humanizeEnum } from "@/lib/statusBadge";
import { AUDIENCE_USER_STATUSES, CAMPAIGN_STATUSES, type ICampaignTargetFilter, type INotificationTemplate, NOTIFICATION_CHANNELS } from "@/types/notification.types";
import { ANY_PLAN, ANY_STATUS } from "@/zod/notification.validation";
import { CAMPAIGN_STATUS_LABEL, CHANNEL_META } from "../notificationOptions";

// In-memory filters: `id` is the column to facet on.
export const CAMPAIGN_FILTERS: DataTableFilterConfig[] = [
  { id: "status", type: "multi-select", label: "Status", options: CAMPAIGN_STATUSES.map((value) => ({ value, label: CAMPAIGN_STATUS_LABEL[value] })) },
  { id: "channel", type: "single-select", label: "Channel", options: NOTIFICATION_CHANNELS.map((value) => ({ value, label: CHANNEL_META[value].label })) },
];

export const USER_STATUS_OPTIONS = [{ value: ANY_STATUS, label: "Any account" }, ...AUDIENCE_USER_STATUSES.map((value) => ({ value, label: `${humanizeEnum(value)} accounts` }))];

export const buildPlanOptions = (plans: { id: string; name: string }[]) => [
  { value: ANY_PLAN, label: "Any plan" },
  ...plans.map((plan) => ({ value: plan.id, label: `${plan.name} plan` })),
];

// Only active templates can be sent; each shows its key and its subject.
export const buildTemplateOptions = (templates: INotificationTemplate[]) =>
  templates.filter((template) => template.isActive).map((template) => ({ value: template.key, label: template.subjectEn ? `${template.key} · "${template.subjectEn}"` : template.key }));

// { planId, status } -> "Free plan, active", "Everyone", "Suspended accounts".
export const describeAudience = (filter: ICampaignTargetFilter, planNames: Map<string, string>) => {
  const plan = filter.planId ? (planNames.has(filter.planId) ? `${planNames.get(filter.planId)} plan` : "A removed plan") : null;
  const status = filter.status ? humanizeEnum(filter.status).toLowerCase() : null;
  if (plan && status) return `${plan}, ${status}`;
  if (plan) return plan;
  if (status) return `Everyone ${status}`;
  return "Everyone";
};
