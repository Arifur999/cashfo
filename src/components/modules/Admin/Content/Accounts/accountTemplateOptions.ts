import type { DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import { enumOptions } from "@/lib/statusBadge";
import { ACCOUNT_TYPES, TEMPLATE_WORKSPACE_TYPES } from "@/types/accountTemplate.types";

export const ACCOUNT_TYPE_OPTIONS = enumOptions(ACCOUNT_TYPES);
export const WORKSPACE_TYPE_OPTIONS = enumOptions(TEMPLATE_WORKSPACE_TYPES);

// In-memory filters: `id` is the column to facet on.
export const ACCOUNT_TEMPLATE_FILTERS: DataTableFilterConfig[] = [
  { id: "accountType", type: "multi-select", label: "Type", options: ACCOUNT_TYPE_OPTIONS },
  { id: "appliesTo", type: "multi-select", label: "Workspace", options: WORKSPACE_TYPE_OPTIONS },
  { id: "status", type: "single-select", label: "Status", options: enumOptions(["ACTIVE", "INACTIVE"]) },
];
