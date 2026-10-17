import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import type { DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import { formatNumber } from "@/lib/number";
import { COUPON_STATUS_LABEL, discountText, usesCap, validityText, worksOn } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";
import { COUPON_STATUSES, type ICoupon } from "@/types/coupon.types";

// In-memory filters: `id` is the column to facet on.
export const COUPON_FILTERS: DataTableFilterConfig[] = [
  { id: "status", type: "multi-select", label: "Status", options: COUPON_STATUSES.map((value) => ({ value, label: COUPON_STATUS_LABEL[value] })) },
];

// The design's coupons list: the code as a dashed tag, what it takes off,
// which plans, how used up it is, when it runs, and its status. Built per
// plan list, since "Works on" shows names for plan ids.
export const buildCouponsColumns = (planNames: Map<string, string>): ColumnDef<ICoupon>[] => [
  {
    id: "code",
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => (
      <code
        className={cn(
          "rounded-sm border border-dashed border-line-strong bg-surface-sunken px-2 py-1 font-mono text-small font-bold tracking-wide",
          row.original.status === "ACTIVE" ? "text-ink" : "text-ink-muted",
        )}
      >
        {row.original.code}
      </code>
    ),
  },
  {
    id: "discount",
    accessorFn: (row) => discountText(row),
    header: "Discount",
    cell: ({ getValue }) => <span className="font-semibold">{String(getValue())}</span>,
    // Sort by the amount, not the formatted text.
    sortingFn: (a, b) => Number(a.original.discountValue) - Number(b.original.discountValue),
  },
  {
    id: "plans",
    accessorFn: (row) => worksOn(row.applicablePlans, planNames),
    header: "Works on",
    enableSorting: false,
    cell: ({ getValue }) => <span className="text-ink-2">{String(getValue())}</span>,
  },
  {
    id: "timesRedeemed",
    accessorKey: "timesRedeemed",
    header: "Used",
    cell: ({ row }) => {
      const { timesRedeemed, maxRedemptions, status } = row.original;
      return (
        <span className="flex w-36 flex-col gap-1">
          <span className="tabular-nums">
            <b className="font-semibold">{formatNumber(timesRedeemed)}</b> <span className="text-ink-muted">{usesCap(maxRedemptions)}</span>
          </span>
          {maxRedemptions !== null && (
            <span className="h-1.25 overflow-hidden rounded-full bg-surface-sunken">
              <span
                className={cn("block h-full rounded-full", status === "ACTIVE" ? "bg-emerald" : "bg-ink-faint")}
                style={{ width: `${Math.min(100, Math.round((timesRedeemed / maxRedemptions) * 100))}%` }}
              />
            </span>
          )}
        </span>
      );
    },
    meta: { exportValue: (row) => `${row.timesRedeemed} ${usesCap(row.maxRedemptions)}` },
  },
  {
    id: "validUntil",
    accessorKey: "validUntil",
    header: "Valid",
    cell: ({ row }) => <span className="whitespace-nowrap text-ink-2">{validityText(row.original.validFrom, row.original.validUntil)}</span>,
    meta: { exportValue: (row) => validityText(row.validFrom, row.validUntil) },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} label={COUPON_STATUS_LABEL[row.original.status]} />,
  },
];
