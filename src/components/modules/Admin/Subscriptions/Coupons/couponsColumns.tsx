import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import type { DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import { formatDate } from "@/lib/date";
import { enumOptions } from "@/lib/statusBadge";
import { COUPON_STATUSES, type ICoupon } from "@/types/coupon.types";
import { formatDiscount, formatRedemptions } from "./couponFormat";

// In-memory filters: `id` is the column to facet on.
export const COUPON_FILTERS: DataTableFilterConfig[] = [
  { id: "status", type: "multi-select", label: "Status", options: enumOptions(COUPON_STATUSES) },
];

// Built per plan list, since the Plans column shows names for plan ids.
export const buildCouponsColumns = (planNames: Map<string, string>): ColumnDef<ICoupon>[] => [
  {
    id: "code",
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => <span className="font-mono font-semibold text-foreground">{row.original.code}</span>,
  },
  {
    id: "discount",
    accessorFn: (row) => formatDiscount(row),
    header: "Discount",
    // Sort by the amount, not the formatted text.
    sortingFn: (a, b) => Number(a.original.discountValue) - Number(b.original.discountValue),
  },
  {
    id: "validUntil",
    accessorKey: "validUntil",
    header: "Valid Until",
    cell: ({ row }) => <DateCell date={row.original.validUntil} />,
    meta: { exportValue: (row) => formatDate(row.validUntil) },
  },
  {
    id: "timesRedeemed",
    accessorKey: "timesRedeemed",
    header: "Redeemed",
    cell: ({ row }) => <span className="tabular-nums">{formatRedemptions(row.original)}</span>,
    meta: { exportValue: (row) => formatRedemptions(row) },
  },
  {
    id: "plans",
    accessorFn: (row) =>
      row.applicablePlans.length === 0 ? "All plans" : row.applicablePlans.map((id) => planNames.get(id) ?? "Unknown plan").join(", "),
    header: "Plans",
    enableSorting: false,
    cell: ({ getValue }) => <span className="text-muted-foreground">{String(getValue())}</span>,
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} />,
  },
];
