import type { DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import { enumOptions } from "@/lib/statusBadge";
import { FLAG_STATUSES, SEVERITIES, SUSPICIOUS_ACTIVITY_TYPES } from "@/types/securityFlag.types";

export const FLAG_STATUS_OPTIONS = enumOptions(FLAG_STATUSES);

// In-memory filters: `id` is the column to facet on.
export const FLAG_FILTERS: DataTableFilterConfig[] = [
  { id: "status", type: "multi-select", label: "Status", options: FLAG_STATUS_OPTIONS },
  { id: "severity", type: "multi-select", label: "Severity", options: enumOptions(SEVERITIES) },
  { id: "type", type: "single-select", label: "Type", options: enumOptions(SUSPICIOUS_ACTIVITY_TYPES) },
];
