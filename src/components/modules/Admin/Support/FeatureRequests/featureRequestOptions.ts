import type { DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import { enumOptions } from "@/lib/statusBadge";
import { FEATURE_REQUEST_STATUSES } from "@/types/featureRequest.types";

export const FEATURE_REQUEST_STATUS_OPTIONS = enumOptions(FEATURE_REQUEST_STATUSES);

// In-memory filters: `id` is the column to facet on.
export const FEATURE_REQUEST_FILTERS: DataTableFilterConfig[] = [
  { id: "status", type: "multi-select", label: "Status", options: FEATURE_REQUEST_STATUS_OPTIONS },
];
