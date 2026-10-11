import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { enumOptions } from "@/lib/statusBadge";
import { type INotificationTemplate, NOTIFICATION_CHANNELS, NOTIFICATION_LOG_STATUSES } from "@/types/notification.types";

// What the page needs to build the identical query string on the server.
export const NOTIFICATION_LOGS_TABLE_BASE_CONFIG = {
  queryKeys: ["channel", "status", "templateKey"],
  defaultLimit: 20,
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit">;

// The template filter lists the templates, so the config is built once
// they load. Memoize the result.
export const buildNotificationLogsTableConfig = (templates: INotificationTemplate[]): ServerDataTableConfig => ({
  ...NOTIFICATION_LOGS_TABLE_BASE_CONFIG,
  filters: [
    { id: "status", type: "single-select", label: "Status", options: enumOptions(NOTIFICATION_LOG_STATUSES) },
    { id: "channel", type: "single-select", label: "Channel", options: enumOptions(NOTIFICATION_CHANNELS) },
    { id: "templateKey", type: "single-select", label: "Template", options: templates.map((template) => ({ value: template.key, label: template.key })) },
  ],
});
