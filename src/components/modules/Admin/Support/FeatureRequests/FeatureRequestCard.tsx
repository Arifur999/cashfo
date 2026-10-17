"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatRelativeDay } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import { cn } from "@/lib/utils";
import type { FeatureRequestStatus, IFeatureRequest } from "@/types/featureRequest.types";
import { DECLINED_COLUMN, FEATURE_REQUEST_COLUMNS } from "./featureRequestOptions";

interface FeatureRequestCardProps {
  request: IFeatureRequest;
  canManage: boolean;
  onMove: (status: FeatureRequestStatus) => void;
  onDragStart: () => void;
  dragging: boolean;
}

// "Asked today", "Asked 14 Oct".
const askedText = (createdAt: string) => {
  const when = formatRelativeDay(createdAt);
  return `Asked ${when.startsWith("Today") ? "today" : when === "Yesterday" ? "yesterday" : when}`;
};

// One request on the board: the votes in a box, the title, when it was
// asked; dragged to another column, or moved from its menu.
const FeatureRequestCard = ({ request, canManage, onMove, onDragStart, dragging }: FeatureRequestCardProps) => {
  return (
    <article
      draggable={canManage}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", request.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      className={cn(
        "flex gap-3 rounded-md border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(14,26,22,0.06)]",
        canManage && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-50",
      )}
    >
      <span className="flex h-11.5 w-10.5 shrink-0 flex-col items-center justify-center rounded-md border border-line" title={`${formatNumber(request.voteCount)} votes`}>
        <b className="text-body font-bold text-ink tabular-nums">{formatNumber(request.voteCount)}</b>
      </span>
      <span className="flex min-w-0 grow flex-col gap-0.75">
        <span className="text-body leading-snug font-semibold text-ink">{request.title}</span>
        <span className="text-caption text-ink-muted">{askedText(request.createdAt)}</span>
      </span>
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="-mt-1 -mr-1 shrink-0 text-ink-muted hover:text-ink" aria-label={`Move "${request.title}"`}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-caption text-ink-muted">Move to</DropdownMenuLabel>
            {[...FEATURE_REQUEST_COLUMNS, DECLINED_COLUMN]
              .filter((column) => column.status !== request.status)
              .map((column) => (
                <DropdownMenuItem key={column.status} onClick={() => onMove(column.status)}>
                  <span className={cn("size-2 rounded-full", column.dot)} aria-hidden="true" /> {column.label}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </article>
  );
};

export default FeatureRequestCard;
