import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { PAYMENT_STATUS_LABEL } from "@/lib/payments";
import { enumOptions } from "@/lib/statusBadge";
import { PAYMENT_GATEWAYS, PAYMENT_STATUSES, type PaymentStatus } from "@/types/payment.types";
import type { IPlanOption } from "@/types/plan.types";

// What the page needs to build the identical query string on the server.
export const PAYMENTS_TABLE_BASE_CONFIG = {
  queryKeys: ["search", "status", "gateway", "planId", "dateFrom", "dateTo"],
  defaultLimit: 10,
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit">;

// The design's order: paid, failed, waiting, refunded.
const STATUS_TABS: PaymentStatus[] = ["SUCCESS", "FAILED", "PENDING", "REFUNDED"];

// The plan chip's options come from the API and the status tabs' counts
// from the stats, so the full config is built once those are loaded
// (memoize the result -- it must stay stable).
export const buildPaymentsTableConfig = (plans: IPlanOption[], statusCounts?: Record<PaymentStatus, number>): ServerDataTableConfig => ({
  ...PAYMENTS_TABLE_BASE_CONFIG,
  search: { placeholder: "Payment ID, name or bKash ref", width: "sm" },
  filters: [
    { id: "status", type: "tabs", label: "Status", options: STATUS_TABS.map((value) => ({ value, label: PAYMENT_STATUS_LABEL[value], count: statusCounts?.[value] })) },
    { id: "gateway", type: "single-select", label: "Gateway", options: enumOptions(PAYMENT_GATEWAYS) },
    { id: "planId", type: "single-select", label: "Plan", options: plans.map((plan) => ({ value: plan.id, label: plan.name })) },
    { id: "createdAt", type: "date-range", label: "Date" },
  ],
});

// Keeps the old ?status= values working; everything else is read by the config.
export const PAYMENT_STATUS_VALUES = PAYMENT_STATUSES;
