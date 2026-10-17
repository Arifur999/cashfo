import { AlertTriangle, Info, Megaphone, Wrench, type LucideIcon } from "lucide-react";
import type { DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import { ANNOUNCEMENT_STATUS_LABEL } from "@/lib/announcements";
import { enumOptions } from "@/lib/statusBadge";
import { ANNOUNCEMENT_STATUSES, ANNOUNCEMENT_TYPES, type AnnouncementType } from "@/types/announcement.types";
import type { ISubscriptionPlan } from "@/types/plan.types";
import { ALL_PLANS } from "@/zod/announcement.validation";

// Each kind of banner: its icon and the colours it is drawn in, in the
// list's chip and in the app.
export const ANNOUNCEMENT_TYPE_META: Record<AnnouncementType, { label: string; icon: LucideIcon; chip: string; banner: string }> = {
  INFO: { label: "Info", icon: Info, chip: "bg-info-soft text-info", banner: "border-info/20 bg-info-soft text-info" },
  WARNING: { label: "Warning", icon: AlertTriangle, chip: "bg-warning-soft text-warning", banner: "border-warning/25 bg-warning-soft text-warning" },
  PROMOTION: { label: "Promotion", icon: Megaphone, chip: "bg-mint-50 text-emerald", banner: "border-mint-200 bg-mint-50 text-emerald" },
  MAINTENANCE: { label: "Maintenance", icon: Wrench, chip: "bg-surface-sunken text-ink-2", banner: "border-line bg-surface-sunken text-ink-2" },
};

export const ANNOUNCEMENT_TYPE_OPTIONS = enumOptions(ANNOUNCEMENT_TYPES);

// In-memory filters: `id` is the column to facet on.
export const ANNOUNCEMENT_FILTERS: DataTableFilterConfig[] = [
  { id: "status", type: "multi-select", label: "Status", options: ANNOUNCEMENT_STATUSES.map((value) => ({ value, label: ANNOUNCEMENT_STATUS_LABEL[value] })) },
  { id: "type", type: "single-select", label: "Type", options: ANNOUNCEMENT_TYPE_OPTIONS },
];

export const buildAudienceOptions = (plans: Pick<ISubscriptionPlan, "id" | "name">[]) => [
  { value: ALL_PLANS, label: "Everyone" },
  ...plans.map((plan) => ({ value: plan.id, label: `${plan.name} plan` })),
];
