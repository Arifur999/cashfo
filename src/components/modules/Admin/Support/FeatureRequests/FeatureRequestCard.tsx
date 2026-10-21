"use client";

import { ChevronUp, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatRelativeDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural, type Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import type { FeatureRequestStatus, IFeatureRequest } from "@/types/featureRequest.types";
import { DECLINED_COLUMN, FEATURE_REQUEST_COLUMNS } from "./featureRequestOptions";
import T from "@/components/shared/T";

interface FeatureRequestCardProps {
  request: IFeatureRequest;
  canManage: boolean;
  onMove: (status: FeatureRequestStatus) => void;
  // Opens the request with its whole text and who asked.
  onOpen: () => void;
  onDragStart: () => void;
  // A drag that ends anywhere (a drop, Esc, outside the board) clears the board's drag state.
  onDragEnd: () => void;
  dragging: boolean;
}

// "Asked today", "Asked 14 Oct".
export const askedText = (createdAt: string, t: Translate) => {
  const when = formatRelativeDay(createdAt);
  if (when.startsWith("Today")) return t("Asked today");
  if (when === "Yesterday") return t("Asked yesterday");
  return t("Asked {date}", { date: when });
};

// "12 votes", the count in the reader's digits.
export const votesText = (count: number, t: Translate, locale: Locale) => plural(t, count, "{count} vote", "{count} votes", { count: formatCount(count, locale) });

// One request on the board: the votes in a box, the title (which opens the
// request), what was asked in up to three lines, and when; dragged to
// another column, or moved from its menu.
const FeatureRequestCard = ({ request, canManage, onMove, onOpen, onDragStart, onDragEnd, dragging }: FeatureRequestCardProps) => {
  const { locale, translate } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const description = request.description.trim();
  // "Show more" goes by whether the text is actually cut, not its length:
  // the columns are narrow at xl, so a short description can still be.
  const textRef = useRef<HTMLSpanElement>(null);
  const [clamped, setClamped] = useState(false);
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    // The observer reports once on observe, then on every resize.
    const observer = new ResizeObserver(() => setClamped(el.scrollHeight > el.clientHeight + 1));
    observer.observe(el);
    return () => observer.disconnect();
  }, [description]);

  return (
    <article
      draggable={canManage}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", request.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn("flex gap-3 rounded-md border border-line bg-surface p-3 shadow-card", canManage && "cursor-grab active:cursor-grabbing", dragging && "opacity-50")}
    >
      <span className="flex h-11.5 w-10.5 shrink-0 flex-col items-center justify-center gap-px rounded-md border border-line" title={votesText(request.voteCount, translate, locale)}>
        <ChevronUp className="size-3.25 text-ink-2" strokeWidth={2.5} aria-hidden="true" />
        <b className="text-body font-bold text-ink tabular-nums">{formatCount(request.voteCount, locale)}</b>
      </span>
      <span className="flex min-w-0 grow flex-col gap-0.75">
        <button type="button" onClick={onOpen} className="text-left text-body font-semibold wrap-break-word text-ink hover:text-emerald hover:underline">
          {request.title}
        </button>
        {description && (
          <>
            <span ref={textRef} className={cn("text-small wrap-break-word whitespace-pre-line text-ink-2", !expanded && "line-clamp-3")}>
              {description}
            </span>
            {(expanded || clamped) && (
              <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="self-start text-caption font-semibold text-emerald hover:underline pointer-coarse:min-h-11">
                {translate(expanded ? "Show less" : "Show more")}
              </button>
            )}
          </>
        )}
        <span className="text-caption text-ink-muted">{askedText(request.createdAt, translate)}</span>
      </span>
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="-mt-1 -mr-1 shrink-0 text-ink-muted hover:text-ink pointer-coarse:size-11" aria-label={translate('Move "{title}"', { title: request.title })}>
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
