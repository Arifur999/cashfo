"use client";

import { Download, Plus } from "lucide-react";
import { mineSummary, paisa } from "@/lib/customer/eventsDisplay";
import type { EventPerson, SocialEvent } from "@/lib/customer/eventsTypes";
import { cn } from "@/lib/utils";
import { typeLook } from "./eventVisuals";
import type { EventWords } from "./useEventWords";

interface EventsMineProps {
  // Your own events, newest first.
  events: SocialEvent[];
  people: EventPerson[];
  selected: SocialEvent | null;
  words: EventWords;
  readOnly: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onAddGift: (event: SocialEvent) => void;
  onDownload: (event: SocialEvent) => void;
}

const LIST_COLUMNS = "grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_120px] gap-x-3 px-3.5";

// The My events page: your own events on the left, and the one picked with
// what came in (or went out, for Eid salami) and from whom.
export function EventsMine({ events, people, selected, words, readOnly, onSelect, onAdd, onAddGift, onDownload }: EventsMineProps) {
  const { t, money, count } = words;
  const nameOf = (id: string) => people.find((person) => person.id === id)?.name ?? "";
  const summary = selected ? mineSummary(selected) : null;
  const look = selected ? typeLook(selected.type) : null;

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2.5">
        {events.map((event) => {
          const item = typeLook(event.type);
          const on = selected?.id === event.id;
          const total = event.gifts.reduce((sum, gift) => sum + paisa(gift.amount), 0);
          const received = event.gifts.some((gift) => gift.direction === "GOT");
          return (
            <button
              key={event.id}
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(event.id)}
              className={cn("flex items-center gap-3 rounded-[16px] bg-surface p-3.5 text-left text-ink", on ? "border-2 border-primary p-[13px]" : "border border-line-card hover:bg-row-hover")}
            >
              <span className={cn("flex size-10.5 shrink-0 items-center justify-center rounded-[12px]", item.bg, item.fg)}>
                <item.Icon className="size-4.75" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[14.5px] font-semibold">{event.title}</span>
                <span className="text-[12.5px] text-ink-muted">
                  {words.day(event.date)} ·{" "}
                  {event.gifts.length ? t(received ? "received {amount}" : "gave {amount}", { amount: money(total) }) : t("no gifts yet")}
                </span>
              </span>
            </button>
          );
        })}
        {!readOnly && (
          <button type="button" onClick={onAdd} className="flex h-11.5 items-center justify-center gap-2 rounded-[14px] border border-dashed border-input text-[13.5px] font-semibold text-emerald hover:bg-emerald-wash">
            <Plus className="size-3.75" strokeWidth={2.25} aria-hidden="true" />
            {t("Add my event")}
          </button>
        )}
        {readOnly && events.length === 0 && <p className="text-body text-ink-muted">{t("No events of your own yet.")}</p>}
      </div>

      {selected && summary && look && (
        <section aria-labelledby="mine-title" className="flex flex-col gap-4 rounded-[20px] border border-line-card bg-surface px-6 py-5.5 shadow-card">
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className={cn("self-start rounded-full px-[9px] py-0.5 text-caption font-semibold", look.bg, look.fg)}>{t(look.label)}</span>
              <h2 id="mine-title" className="mt-0.5 text-[20px] font-semibold text-ink">
                {selected.title}
              </h2>
              <span className="text-small text-ink-muted">{[words.day(selected.date), selected.time && words.clock(selected.time), selected.place].filter(Boolean).join(" · ")}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={() => onDownload(selected)} className="flex h-9.5 items-center gap-1.5 rounded-full border border-input bg-surface px-3.5 text-small font-semibold whitespace-nowrap text-ink hover:bg-surface-sunken">
                <Download className="size-3.5 text-ink-soft" strokeWidth={2.25} aria-hidden="true" />
                {t("Download list")}
              </button>
              {!readOnly && (
                <button type="button" onClick={() => onAddGift(selected)} className="flex h-9.5 items-center gap-1.5 rounded-full bg-primary px-3.5 text-small font-semibold whitespace-nowrap text-primary-foreground hover:bg-emerald-hover">
                  <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                  {t("Add a gift")}
                </button>
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {[
              { label: "Cash", value: money(summary.cash) },
              { label: "Gifts, at their value", value: money(summary.items) },
              { label: "People", value: count(summary.people) },
            ].map((tile) => (
              <div key={tile.label} className="flex flex-col gap-[3px] rounded-[14px] border border-head-rule bg-head-wash px-3.5 py-3">
                <span className="text-[12.5px] text-ink-muted">{t(tile.label)}</span>
                <span className="text-[19px] font-bold text-ink tabular-nums">{tile.value}</span>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-[14px] border border-head-rule">
            <div className="min-w-[480px]">
              <div className={cn(LIST_COLUMNS, "bg-head-wash py-2.5 text-caption font-semibold tracking-[0.03em] text-ink-muted uppercase")}>
                <span>#</span>
                <span>{t(summary.received ? "From" : "To")}</span>
                <span>{t("Gift")}</span>
                <span className="text-right">{t("Value")}</span>
              </div>
              {selected.gifts.map((gift, index) => (
                <div key={gift.id} className={cn(LIST_COLUMNS, "min-h-11.5 items-center border-t border-page text-body")}>
                  <span className="text-ink-faint">{count(index + 1)}</span>
                  <span className="truncate font-semibold text-ink">{nameOf(gift.personId)}</span>
                  <span className="flex min-w-0 items-center gap-1.5 text-ink-2">
                    <span className={cn("rounded-full px-2 py-px text-[11.5px] font-semibold", gift.kind === "ITEM" ? "bg-tint-violet text-tint-violet-ink" : "bg-mint-50 text-brand-ink")}>{t(gift.kind === "ITEM" ? "Gift" : "Cash")}</span>
                    {gift.kind === "ITEM" && <span className="truncate">{gift.item}</span>}
                  </span>
                  <span className="text-right font-semibold text-ink tabular-nums">{money(paisa(gift.amount))}</span>
                </div>
              ))}
              {selected.gifts.length === 0 && <p className="border-t border-page px-3.5 py-4 text-body text-ink-muted">{t("No gift written down yet.")}</p>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
