import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { enumOptions } from "@/lib/statusBadge";
import { SEVERITIES } from "@/types/securityFlag.types";
import { ERROR_SOURCES } from "@/types/system.types";

// Shared by the page's prefetch and the client table.
export const ERROR_LOGS_TABLE_CONFIG: ServerDataTableConfig = {
  queryKeys: ["source", "severity", "resolved", "dateFrom", "dateTo"],
  defaultLimit: 20,
  filters: [
    {
      id: "resolved",
      type: "single-select",
      label: "Status",
      options: [
        { value: "false", label: "Open" },
        { value: "true", label: "Resolved" },
      ],
    },
    { id: "severity", type: "single-select", label: "Severity", options: enumOptions(SEVERITIES) },
    { id: "source", type: "single-select", label: "Source", options: enumOptions(ERROR_SOURCES) },
    { id: "createdAt", type: "date-range", label: "Date" },
  ],
};
