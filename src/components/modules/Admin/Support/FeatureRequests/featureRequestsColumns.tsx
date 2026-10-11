import type { ColumnDef } from "@tanstack/react-table";
import { ArrowBigUp } from "lucide-react";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { formatDate } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import { humanizeEnum } from "@/lib/statusBadge";
import type { IFeatureRequest } from "@/types/featureRequest.types";
import FeatureRequestStatusSelect from "./FeatureRequestStatusSelect";

// The full description is already previewed under the title; the column
// still makes it searchable and exportable, and can be shown from View.
export const FEATURE_REQUESTS_HIDDEN_COLUMNS = ["description"] as const;

// Built per role: managers change the status inline, others see a badge.
export const buildFeatureRequestsColumns = (canManage: boolean): ColumnDef<IFeatureRequest>[] => [
  {
    id: "voteCount",
    accessorKey: "voteCount",
    header: "Votes",
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-1 font-semibold text-foreground tabular-nums">
        <ArrowBigUp className="size-4 text-primary" aria-hidden="true" />
        {formatNumber(row.original.voteCount)}
      </span>
    ),
  },
  {
    id: "title",
    accessorKey: "title",
    header: "Request",
    cell: ({ row }) => (
      <div className="max-w-md min-w-0 space-y-0.5">
        <p className="font-medium whitespace-normal text-foreground">{row.original.title}</p>
        <p className="line-clamp-2 text-xs whitespace-normal text-muted-foreground">{row.original.description}</p>
      </div>
    ),
  },
  {
    id: "description",
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => <p className="max-w-md text-sm whitespace-pre-wrap text-muted-foreground">{row.original.description}</p>,
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (canManage ? <FeatureRequestStatusSelect request={row.original} /> : <StatusBadgeCell status={row.original.status} />),
    meta: { exportValue: (row) => humanizeEnum(row.status) },
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Submitted",
    cell: ({ row }) => <DateCell date={row.original.createdAt} />,
    meta: { exportValue: (row) => formatDate(row.createdAt) },
  },
];
