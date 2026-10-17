"use client";

import { ChevronUp, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatRelativeDay } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural, type Translate } from "@/lib/i18n/message";
import { formatNumber } from "@/lib/number";
import { cn } from "@/lib/utils";
import type { FeatureRequestStatus, IFeatureRequest } from "@/types/featureRequest.types";
import { DECLINED_COLUMN, FEATURE_REQUEST_COLUMNS } from "./featureRequestOptions";
import T from "@/components/shared/T";

interface FeatureRequestCardProps {
  request: IFeatureRequest;
  canManage: boolean;
  onMove: (status: FeatureRequestStatus) => void;
  onDragStart: () => void;
  dragging: boolean;
}

// "Asked today", "Asked 14 Oct".
const askedText = (createdAt: string, t: Translate) => {
  const when = formatRelativeDay(createdAt);
  if (when.startsWith("Today")) return t("Asked today");
  if (when === "Yesterday") return t("Asked yesterday");
  return t("Asked {date}", { date: when });
};

// One request on the board: the votes in a box, the title, when it was
// asked; dragged to another column, or moved from its menu.
const FeatureRequestCard = ({ request, canManage, onMove, onDragStart, dragging }: FeatureRequestCardProps) => {
  const { translate } = useLocale();
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
      <span className="flex h-11.5 w-10.5 shrink-0 flex-col items-center justify-center gap-px rounded-md border border-line" title={plural(translate, request.voteCount, "{count} vote", "{count} votes")}>
        <ChevronUp className="size-3.25 text-ink-2" strokeWidth={2.5} aria-hidden="true" />
        <b className="text-body font-bold text-ink tabular-nums">{formatNumber(request.voteCount)}</b>
      </span>
      <span className="flex min-w-0 grow flex-col gap-0.75">
        <span className="text-body leading-snug font-semibold text-ink">{request.title}</span>
        <span className="text-caption text-ink-muted">{askedText(request.createdAt, translate)}</span>
      </span>
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="-mt-1 -mr-1 shrink-0 text-ink-muted hover:text-ink" aria-label={translate('Move "{title}"', { title: request.title })}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-caption text-ink-muted"><T>Move to</T></DropdownMenuLabel>
            {[...FEATURE_REQUEST_COLUMNS, DECLINED_COLUMN]
              .filter((column) => column.status !== request.status)
              .map((column) => (
                <DropdownMenuItem key={column.status} onClick={() => onMove(column.status)}>
                  <span className={cn("size-2 rounded-full", column.dot)} aria-hidden="true" /> <T>{column.label}</T>
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </article>
  );
};

export default FeatureRequestCard;
