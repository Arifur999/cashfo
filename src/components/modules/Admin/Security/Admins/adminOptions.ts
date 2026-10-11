import type { DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import { enumOptions } from "@/lib/statusBadge";
import { ADMIN_ROLES, ADMIN_STATUSES } from "@/types/adminAccount.types";

export const ADMIN_ROLE_OPTIONS = enumOptions(ADMIN_ROLES);

// In-memory filters: `id` is the column to facet on.
export const ADMIN_FILTERS: DataTableFilterConfig[] = [
  { id: "role", type: "multi-select", label: "Role", options: ADMIN_ROLE_OPTIONS },
  { id: "status", type: "single-select", label: "Status", options: enumOptions(ADMIN_STATUSES) },
];
