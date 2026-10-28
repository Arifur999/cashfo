import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";

// What the pages need to build the identical query strings on the server
// (kept out of the client tables, whose exports a Server Component can't
// read as values).
export const PAYOUTS_TABLE_BASE_CONFIG = {
  queryKeys: ["status", "method"],
  defaultLimit: 10,
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit">;

export const REFERRALS_TABLE_BASE_CONFIG = {
  queryKeys: ["search", "status"],
  defaultLimit: 10,
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit">;
