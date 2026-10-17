import { enumOptions } from "@/lib/statusBadge";
import { FEATURE_REQUEST_STATUSES, type FeatureRequestStatus } from "@/types/featureRequest.types";

export const FEATURE_REQUEST_STATUS_OPTIONS = enumOptions(FEATURE_REQUEST_STATUSES);

// The board's columns, in the order a request moves through them, each with
// the dot colour the design gives it. Declined sits apart.
export const FEATURE_REQUEST_COLUMNS: { status: FeatureRequestStatus; label: string; dot: string }[] = [
  { status: "SUBMITTED", label: "New", dot: "bg-ink-muted" },
  { status: "UNDER_REVIEW", label: "Looking at it", dot: "bg-info" },
  { status: "PLANNED", label: "Planned", dot: "bg-pillar-habits" },
  { status: "IN_PROGRESS", label: "Being built", dot: "bg-warning-fill" },
  { status: "SHIPPED", label: "Shipped", dot: "bg-emerald" },
];

export const DECLINED_COLUMN = { status: "DECLINED" as const, label: "Declined", dot: "bg-expense-fill" };

export const FEATURE_REQUEST_STATUS_LABEL: Record<FeatureRequestStatus, string> = Object.fromEntries(
  [...FEATURE_REQUEST_COLUMNS, DECLINED_COLUMN].map((column) => [column.status, column.label]),
) as Record<FeatureRequestStatus, string>;
