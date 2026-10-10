import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";

// The overview endpoint only pages (page/limit); no search or filters.
export const WORKSPACES_TABLE_CONFIG: ServerDataTableConfig = {
  queryKeys: [],
  defaultLimit: 20,
};
