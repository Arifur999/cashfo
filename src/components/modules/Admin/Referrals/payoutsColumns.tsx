"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Check } from "lucide-react";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import Button from "@/components/smartly/Button";
import { formatCurrency } from "@/lib/currency";
import { formatDate, formatDayName } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { countPhrase } from "@/components/modules/Admin/Payments/paymentsDisplay";
import { cn } from "@/lib/utils";
import type { IPayoutRow } from "@/types/referral.types";
import { MethodMark } from "./PayoutDrawer";
import { PAYOUT_STATUS_CHIP, payoutAccountLine, payoutDestination, rowActions, rowChecks, statusNote, type RowAction } from "./payoutsDisplay";

export interface PayoutRowHandlers {
  canManage: boolean;
  isApproving: (id: string) => boolean;
  onApprove: (row: IPayoutRow) => void;
  onReject: (row: IPayoutRow) => void;
  onOpen: (row: IPayoutRow) => void;
}

const Money = ({ value }: { value: string }) => {
  const { locale } = useLocale();
  return formatCurrency(value, undefined, Number(value) % 1 ? 2 : 0, locale);
};

// "1 Oct, 11:20 am": when it was asked for.
const When = ({ value }: { value: string }) => {
  const { locale } = useLocale();
  return formatDate(value, "d MMM, h:mm aaa", "—", locale);
};

const Friends = ({ count }: { count: number }) => {
  const { translate, locale } = useLocale();
  return countPhrase(translate, locale, count, "{count} paying friend", "{count} paying friends");
};

const Checks = ({ row }: { row: IPayoutRow }) => {
  const { translate } = useLocale();
  return (
    <span className="flex flex-col gap-0.75">
      {rowChecks(row).map((line, index) => (
        <span key={index} className={cn("flex items-center gap-1.25 truncate text-caption", line.ok ? "text-emerald" : "text-warning")}>
          {line.ok ? <Check className="size-3 shrink-0" strokeWidth={2.75} aria-hidden="true" /> : <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />}
          <span className="truncate">{translate(line.text, line.values)}</span>
        </span>
      ))}
    </span>
  );
};

const Status = ({ row }: { row: IPayoutRow }) => {
  const { translate, locale } = useLocale();
  const chip = PAYOUT_STATUS_CHIP[row.status];
  const note = statusNote(row);
  const day = note.withDay ? (row.status === "REQUESTED" ? formatDayName(row.createdAt, { t: translate, locale }) : formatDate(row.statusAt, "d MMM", "—", locale)) : "";
  return (
    <span className="flex flex-col items-start gap-0.5">
      <StatusBadgeCell status={row.status} label={chip.label} tone={chip.tone} dot />
      <span className="text-[11.5px] text-ink-muted">{translate(note.text, { day })}</span>
    </span>
  );
};

const ACTION_BUTTON: Record<RowAction, { label: string; className: string; primary?: boolean }> = {
  approve: { label: "Approve", className: "", primary: true },
  reject: { label: "Reject", className: "border-expense-line text-expense hover:bg-expense-soft" },
  review: { label: "Review", className: "" },
  pay: { label: "Mark paid", className: "", primary: true },
  view: { label: "View", className: "" },
};

const Actions = ({ row, handlers }: { row: IPayoutRow; handlers: PayoutRowHandlers }) => {
  const { translate } = useLocale();
  const busy = handlers.isApproving(row.id);
  return (
    <span className="flex justify-end gap-1.5">
      {rowActions(row, handlers.canManage).map((action) => {
        const look = ACTION_BUTTON[action];
        const onClick = action === "approve" ? handlers.onApprove : action === "reject" ? handlers.onReject : handlers.onOpen;
        return (
          <Button
            key={action}
            type="button"
            size="xs"
            variant={look.primary ? "primary" : "secondary"}
            className={cn("h-8 px-2.75 text-[12.5px]", look.className)}
            disabled={busy}
            aria-label={`${translate(look.label)} ${row.displayId}`}
            onClick={(event) => {
              event.stopPropagation();
              onClick(row);
            }}
          >
            {translate(action === "approve" && busy ? "Approving..." : look.label)}
          </Button>
        );
      })}
    </span>
  );
};

// The design's payout desk: the request and when, who, how much, where it
// goes, the checks, the status, and the next step.
export const buildPayoutColumns = (handlers: PayoutRowHandlers): ColumnDef<IPayoutRow>[] => [
  {
    id: "request",
    accessorKey: "displayId",
    header: "Request",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="flex flex-col gap-0.5">
        <span className="font-mono text-[12.5px] font-semibold text-ink">{row.original.displayId}</span>
        <span className="truncate text-caption text-ink-muted">
          <When value={row.original.createdAt} />
        </span>
      </span>
    ),
    meta: { width: 104 },
  },
  {
    id: "user",
    accessorFn: (row) => row.user.name,
    header: "User",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-semibold text-ink">{row.original.user.name}</span>
        <span className="truncate text-caption text-ink-muted">
          <Friends count={row.original.payingFriends} />
        </span>
      </span>
    ),
  },
  {
    id: "amount",
    accessorKey: "amount",
    header: "Amount",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-bold text-ink tabular-nums">
        <Money value={row.original.amount} />
      </span>
    ),
    meta: { width: 80, align: "right" },
  },
  {
    id: "sendTo",
    accessorFn: (row) => payoutDestination(row.method),
    header: "Send to",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="flex min-w-0 items-center gap-2">
        <MethodMark method={row.original.method} />
        <span className="flex min-w-0 flex-col gap-px">
          <span className="truncate text-ink tabular-nums">{payoutDestination(row.original.method)}</span>
          <span className="truncate text-caption text-ink-muted">{payoutAccountLine(row.original.method)}</span>
        </span>
      </span>
    ),
    meta: { width: 236 },
  },
  {
    id: "checks",
    header: "Checks",
    enableSorting: false,
    cell: ({ row }) => <Checks row={row.original} />,
    meta: { width: 184 },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    enableSorting: false,
    cell: ({ row }) => <Status row={row.original} />,
    meta: { width: 112 },
  },
  {
    id: "action",
    header: "Action",
    enableSorting: false,
    cell: ({ row }) => <Actions row={row.original} handlers={handlers} />,
    meta: { width: 150, align: "right" },
  },
];
