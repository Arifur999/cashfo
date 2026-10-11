import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";

// The invoices endpoint filters by date only (no free-text search).
export const INVOICES_TABLE_CONFIG: ServerDataTableConfig = {
  queryKeys: ["dateFrom", "dateTo"],
  defaultLimit: 10,
  filters: [{ id: "createdAt", type: "date-range", label: "Date" }],
};
