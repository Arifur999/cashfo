import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";

export const MANAGE_OWNERS_TABLE_CONFIG: ServerDataTableConfig = {
  queryKeys: ["search"],
  defaultLimit: 20,
  search: { placeholder: "Search by name, business, email or phone..." },
};
