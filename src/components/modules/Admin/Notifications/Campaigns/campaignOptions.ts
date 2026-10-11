import type { DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import { enumOptions, humanizeEnum } from "@/lib/statusBadge";
import {
  AUDIENCE_USER_STATUSES,
  CAMPAIGN_STATUSES,
  type ICampaignTargetFilter,
  type INotificationTemplate,
  NOTIFICATION_CHANNELS,
} from "@/types/notification.types";
import { ANY_PLAN, ANY_STATUS } from "@/zod/notification.validation";

// In-memory filters: `id` is the column to facet on.
export const CAMPAIGN_FILTERS: DataTableFilterConfig[] = [
  { id: "status", type: "multi-select", label: "Status", options: enumOptions(CAMPAIGN_STATUSES) },
  { id: "channel", type: "single-select", label: "Channel", options: enumOptions(NOTIFICATION_CHANNELS) },
];

export const USER_STATUS_OPTIONS = [{ value: ANY_STATUS, label: "Any status" }, ...enumOptions(AUDIENCE_USER_STATUSES)];

export const buildPlanOptions = (plans: { id: string; name: string }[]) => [
  { value: ANY_PLAN, label: "Any plan" },
  ...plans.map((plan) => ({ value: plan.id, label: plan.name })),
];

// Only active templates can be sent.
export const buildTemplateOptions = (templates: INotificationTemplate[]) =>
  templates.filter((template) => template.isActive).map((template) => ({ value: template.key, label: template.key }));

// { planId, status } -> "Active users on Monthly Pro"
export const describeAudience = (filter: ICampaignTargetFilter, planNames: Map<string, string>) => {
  const who = filter.status ? `${humanizeEnum(filter.status)} users` : "All users";
  if (!filter.planId) {
    return who;
  }
  return `${who} on ${planNames.get(filter.planId) ?? "an unknown plan"}`;
};
