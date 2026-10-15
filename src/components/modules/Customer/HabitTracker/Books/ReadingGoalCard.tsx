"use client";

import Card from "@/components/smartly/Card";
import type { Book } from "@/lib/customer/api";
import { finishedIn, goalPace, shelves } from "@/lib/customer/libraryDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { paletteFor } from "./bookPalette";

interface ReadingGoalCardProps {
  books: Book[];
  year: number;
  goalTarget: number | null;
  today: string;
  onEdit: () => void;
}

// Spine heights on the shelf at the bottom, so the row reads as books
// rather than a bar chart.
const SPINE_HEIGHTS = [46, 40, 48, 42, 44, 39, 45];
// 16 spines of 14px with 4px gaps fill the card's 300px.
const MAX_SPINES = 16;
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// This year's goal as a ring, how the reader stands against the calendar,
// and a spine on the shelf for every book finished.
export function ReadingGoalCard({ books, year, goalTarget, today, onEdit }: ReadingGoalCardProps) {
  const { t } = useLocale();
  const finished = finishedIn(shelves(books).FINISHED, year).reverse(); // oldest first, as they went on the shelf
  const pace = goalTarget ? goalPace(books, year, goalTarget, today) : null;
  const fill = pace ? Math.min(1, pace.finished / pace.target) : 0;
  const placeholders = pace ? Math.max(0, Math.min(pace.toGo, MAX_SPINES - finished.length)) : 0;

  const every = (weeks: number) => (weeks < 1 ? `${Math.max(1, Math.round(weeks * 7))} ${t("days")}` : weeks < 1.5 ? t("week") : `${weeks} ${t("weeks")}`);

  return (
    <Card padding="none" className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-title font-semibold text-ink">
          {year} {t("reading goal")}
        </h2>
        <button type="button" onClick={onEdit} className="text-small font-semibold text-emerald hover:underline">
          {goalTarget ? t("Edit") : t("Set a goal")}
        </button>
      </div>

      <div className="flex items-center gap-4">
        <span role="img" aria-label={pace ? `${pace.finished} ${t("of")} ${pace.target} ${t("books finished")}` : `${finished.length} ${t("books finished")}`} className="relative size-21 shrink-0">
          <svg viewBox="0 0 84 84" className="size-21 -rotate-90">
            <circle cx="42" cy="42" r={RADIUS} className="fill-none stroke-surface-sunken" strokeWidth="8" />
            {fill > 0 && <circle cx="42" cy="42" r={RADIUS} className="fill-none stroke-emerald" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${fill * CIRCUMFERENCE} ${CIRCUMFERENCE}`} />}
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-title font-bold text-ink tabular-nums">{pace ? `${pace.finished}/${pace.target}` : finished.length}</span>
        </span>
        <div className="flex min-w-0 flex-col gap-0.75">
          {pace ? (
            <>
              <span className="text-title font-semibold text-ink">{pace.toGo === 0 ? t("Goal reached!") : `${pace.toGo} ${t(pace.toGo === 1 ? "book to go" : "books to go")}`}</span>
              {pace.toGo > 0 && (
                <span className={cn("text-small font-semibold", pace.behind > 0 ? "text-warning" : "text-income")}>
                  {pace.behind > 0 ? `${pace.behind} ${t("behind pace")}` : pace.behind < 0 ? `${-pace.behind} ${t("ahead of pace")}` : t("On pace")}
                </span>
              )}
              {pace.weeksPerBook !== null && (
                <span className="text-small text-ink-muted">
                  {t("About one book every")} {every(pace.weeksPerBook)} {t("to finish by December.")}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-title font-semibold text-ink">
                {finished.length} {t(finished.length === 1 ? "book finished this year" : "books finished this year")}
              </span>
              <span className="text-small text-ink-muted">{t("Set a goal for the year and watch it fill.")}</span>
            </>
          )}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <span className="text-caption font-semibold text-ink-muted">{t("Finished this year")}</span>
        {finished.length === 0 && placeholders === 0 ? (
          <span className="border-b-[3px] border-line pb-3 text-small text-ink-muted">{t("Nothing finished yet.")}</span>
        ) : (
          <div aria-hidden="true" className="flex h-13 items-end gap-1 border-b-[3px] border-line pb-1">
            {finished.slice(0, MAX_SPINES).map((book, index) => (
              <span key={book.id} title={book.title} className="w-3.5 rounded-t-[2px]" style={{ height: SPINE_HEIGHTS[index % SPINE_HEIGHTS.length], background: paletteFor(book.color).from }} />
            ))}
            {Array.from({ length: placeholders }, (_, index) => (
              <span key={index} className="w-3.5 rounded-t-[2px] border-[1.5px] border-b-0 border-dashed border-line-strong" style={{ height: SPINE_HEIGHTS[(finished.length + index) % SPINE_HEIGHTS.length] }} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
