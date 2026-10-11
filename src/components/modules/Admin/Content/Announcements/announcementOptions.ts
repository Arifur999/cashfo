import type { DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import { enumOptions } from "@/lib/statusBadge";
import { ANNOUNCEMENT_STATUSES, ANNOUNCEMENT_TYPES } from "@/types/announcement.types";
import type { ISubscriptionPlan } from "@/types/plan.types";
import { ALL_PLANS } from "@/zod/announcement.validation";

export const ANNOUNCEMENT_TYPE_OPTIONS = enumOptions(ANNOUNCEMENT_TYPES);

// In-memory filters: `id` is the column to facet on.
export const ANNOUNCEMENT_FILTERS: DataTableFilterConfig[] = [
  { id: "status", type: "multi-select", label: "Status", options: enumOptions(ANNOUNCEMENT_STATUSES) },
  { id: "type", type: "single-select", label: "Type", options: ANNOUNCEMENT_TYPE_OPTIONS },
];

export const buildAudienceOptions = (plans: Pick<ISubscriptionPlan, "id" | "name">[]) => [
  { value: ALL_PLANS, label: "All users" },
  ...plans.map((plan) => ({ value: plan.id, label: `${plan.name} subscribers` })),
];
