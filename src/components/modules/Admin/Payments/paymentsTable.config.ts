import type { DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { enumOptions } from "@/lib/statusBadge";
import type { PaymentsView } from "@/queries/payment.queries";
import { PAYMENT_GATEWAYS, PAYMENT_STATUSES } from "@/types/payment.types";

const STATUS_FILTER: DataTableFilterConfig = { id: "status", type: "single-select", label: "Status", options: enumOptions(PAYMENT_STATUSES) };
const GATEWAY_FILTER: DataTableFilterConfig = { id: "gateway", type: "single-select", label: "Gateway", options: enumOptions(PAYMENT_GATEWAYS) };
const DATE_FILTER: DataTableFilterConfig = { id: "createdAt", type: "date-range", label: "Date" };

const SEARCH = { placeholder: "Search by user, email or invoice #..." };

// `view` is a frontend-only URL param (it picks the endpoint), so it's never
// in queryKeys -- the API would reject it.
export const PAYMENTS_TABLE_CONFIG: Record<PaymentsView, ServerDataTableConfig> = {
  all: {
    queryKeys: ["search", "status", "gateway", "dateFrom", "dateTo"],
    defaultLimit: 10,
    search: SEARCH,
    filters: [STATUS_FILTER, GATEWAY_FILTER, DATE_FILTER],
  },
  // Every row is FAILED here, so there's no status filter.
  failed: {
    queryKeys: ["search", "gateway", "dateFrom", "dateTo"],
    defaultLimit: 10,
    search: SEARCH,
    filters: [GATEWAY_FILTER, DATE_FILTER],
  },
};

export const getPaymentsView = (value: string | string[] | null | undefined): PaymentsView => (value === "failed" ? "failed" : "all");
