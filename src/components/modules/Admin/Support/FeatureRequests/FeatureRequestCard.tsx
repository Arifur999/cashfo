"use client";

import { ChevronUp } from "lucide-react";
import { formatRelativeDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural, type Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import type { IFeatureRequest } from "@/types/featureRequest.types";

interface FeatureRequestCardProps {
  request: IFeatureRequest;
  canManage: boolean;
  // Opens the request with its whole text, who asked, and its status.
  onOpen: () => void;
  onDragStart: () => void;
  // A drag that ends anywhere (a drop, Esc, outside the board) clears the board's drag state.
  onDragEnd: () => void;
  dragging: boolean;
}

// "Asked today", "Asked 14 Oct". The words stay English for the checks
// below; the date comes in the reader's months and digits ("৬ অক্টো").
export const askedText = (createdAt: string, t: Translate, locale: Locale = "en") => {
  const when = formatRelativeDay(createdAt, { locale });
  if (when.startsWith("Today")) return t("Asked today");
  if (when === "Yesterday") return t("Asked yesterday");
  return t("Asked {date}", { date: when });
};

// "12 votes", the count in the reader's digits.
export const votesText = (count: number, t: Translate, locale: Locale) => plural(t, count, "{count} vote", "{count} votes", { count: formatCount(count, locale) });

// One request on the board, as the board draws it: the votes in a box, the
// title (which opens the request, its text, who asked and its status) and
// when it was asked. Dragged to another column to move it; the drawer's
// status does the same from the keyboard.
const FeatureRequestCard = ({ request, canManage, onOpen, onDragStart, onDragEnd, dragging }: FeatureRequestCardProps) => {
  const { locale, translate } = useLocale();

  return (
    <article
      draggable={canManage}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", request.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "flex gap-2.5 rounded-card border border-line-card bg-surface px-3 py-2.5 shadow-[0_1px_2px_rgba(18,32,29,0.05)]",
        canManage && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-50",
      )}
    >
      <span className="flex h-11.5 w-10.5 shrink-0 flex-col items-center justify-center gap-px rounded-sm border border-line" title={votesText(request.voteCount, translate, locale)}>
        <ChevronUp className="size-3.25 text-ink-2" strokeWidth={2.5} aria-hidden="true" />
        <b className="text-[13.5px] leading-[normal] font-bold text-ink tabular-nums">{formatCount(request.voteCount, locale)}</b>
        <span className="sr-only">{votesText(request.voteCount, translate, locale)}</span>
      </span>
      <span className="flex min-w-0 grow flex-col gap-0.75">
        <button type="button" onClick={onOpen} className="text-left text-[13.5px] leading-[1.35] font-semibold wrap-break-word text-ink hover:text-emerald hover:underline">
          {request.title}
        </button>
        <span className="text-caption text-ink-muted">{askedText(request.createdAt, translate, locale)}</span>
      </span>
    </article>
  );
};

export default FeatureRequestCard;
