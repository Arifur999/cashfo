"use client";

import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import Localized from "@/components/shared/Localized";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { COUPON_STATUS_LABEL, discountText, usesCap, validityText, worksOn } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";
import type { ICoupon } from "@/types/coupon.types";
import T from "@/components/shared/T";

// "120 of 500" with its meter, the counts in the reader's digits. One
// sentence, so Bangla can put "of 500" before the count.
const UsesCell = ({ coupon }: { coupon: ICoupon }) => {
  const { translate, locale } = useLocale();
  const { timesRedeemed, maxRedemptions, status } = coupon;
  return (
    <span className="flex w-full max-w-36 flex-col gap-1">
      <span className="tabular-nums">
        <T
          values={{
            used: <b className="font-semibold">{formatCount(timesRedeemed, locale)}</b>,
            cap: <span className="text-ink-muted">{usesCap(maxRedemptions, translate, locale)}</span>,
          }}
        >
          {maxRedemptions === null ? "{used} {cap}@@unlimited" : "{used} {cap}"}
        </T>
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
};

// When it runs, in the reader's language ("৪ সেপ্টে – ৩১ ডিসে ২০২৬"), cut
// short with the whole of it on hover.
const ValidityCell = ({ coupon }: { coupon: ICoupon }) => {
  const { locale } = useLocale();
  const text = validityText(coupon.validFrom, coupon.validUntil, locale);
  return (
    <span className="block truncate text-ink-2" title={text}>
      {text}
    </span>
  );
};

// The design's coupons list: the code as a dashed tag, what it takes off,
// which plans, how used up it is, when it runs, and its status. Built per
// plan list, since "Works on" shows names for plan ids. Cells that can't
// shrink are cut short with their whole text on hover, so a narrow screen
// or a Bangla word never runs into the next column.
export const buildCouponsColumns = (planNames: Map<string, string>): ColumnDef<ICoupon>[] => [
  {
    id: "code",
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => (
      <code
        title={row.original.code}
        className={cn(
          "inline-block max-w-full truncate rounded-sm border border-dashed border-line-strong bg-surface-sunken px-2 py-1 align-middle font-mono text-small font-bold tracking-wide",
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
    cell: ({ row }) => <span className="font-semibold">{<Localized>{(t) => discountText(row.original, t)}</Localized>}</span>,
    // Sort by the amount, not the formatted text.
    sortingFn: (a, b) => Number(a.original.discountValue) - Number(b.original.discountValue),
    meta: { width: 110 },
  },
  {
    id: "plans",
    accessorFn: (row) => worksOn(row.applicablePlans, planNames),
    header: "Works on",
    enableSorting: false,
    cell: ({ row }) => (
      <Localized>
        {(t) => {
          const text = worksOn(row.original.applicablePlans, planNames, t);
          return (
            <span className="block truncate text-ink-2" title={text}>
              {text}
            </span>
          );
        }}
      </Localized>
    ),
    meta: { width: 170 },
  },
  {
    id: "timesRedeemed",
    accessorKey: "timesRedeemed",
    header: "Used",
    cell: ({ row }) => <UsesCell coupon={row.original} />,
    meta: { width: 170, exportValue: (row) => `${row.timesRedeemed} ${usesCap(row.maxRedemptions)}` },
  },
  {
    id: "validUntil",
    accessorKey: "validUntil",
    header: "Valid",
    cell: ({ row }) => <ValidityCell coupon={row.original} />,
    meta: { width: 170, exportValue: (row) => validityText(row.validFrom, row.validUntil) },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} label={COUPON_STATUS_LABEL[row.original.status]} />,
  },
];
