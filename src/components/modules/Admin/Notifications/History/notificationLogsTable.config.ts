import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { type INotificationTemplate, NOTIFICATION_CHANNELS, NOTIFICATION_LOG_STATUSES } from "@/types/notification.types";
import { CHANNEL_META, LOG_STATUS_LABEL } from "../notificationOptions";

// What the page needs to build the identical query string on the server.
export const NOTIFICATION_LOGS_TABLE_BASE_CONFIG = {
  queryKeys: ["channel", "status", "templateKey"],
  defaultLimit: 20,
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit">;

// The template filter lists the templates, so the config is built once
// they load. Memoize the result. The status and channel choices read as
// the rows' own badges and chips do ("Waiting to send", "In-app").
export const buildNotificationLogsTableConfig = (templates: INotificationTemplate[]): ServerDataTableConfig => ({
  ...NOTIFICATION_LOGS_TABLE_BASE_CONFIG,
  filters: [
    { id: "status", type: "single-select", label: "Status", options: NOTIFICATION_LOG_STATUSES.map((status) => ({ value: status, label: LOG_STATUS_LABEL[status] })) },
    { id: "channel", type: "single-select", label: "Channel", options: NOTIFICATION_CHANNELS.map((channel) => ({ value: channel, label: CHANNEL_META[channel].label })) },
    { id: "templateKey", type: "single-select", label: "Template", options: templates.map((template) => ({ value: template.key, label: template.key })) },
  ],
});

// Whether the URL narrows the history, so an empty list can tell "nothing
// matches" from "nothing has been sent".
export const hasLogFilters = (params: { get: (key: string) => string | null }) => NOTIFICATION_LOGS_TABLE_BASE_CONFIG.queryKeys.some((key) => Boolean(params.get(key)));
