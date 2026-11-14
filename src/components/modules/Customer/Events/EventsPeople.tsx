"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { avatarTint, daysFrom, latestEventOf, type Ledger, matchesPerson, type PeopleFilter, STANDING_TINT, standingOf } from "@/lib/customer/eventsDisplay";
import type { EventPerson, SocialEvent } from "@/lib/customer/eventsTypes";
import { wordInitials } from "@/lib/customer/loanDisplay";
import { cn } from "@/lib/utils";
import { TINT } from "./eventVisuals";
import type { EventWords } from "./useEventWords";
import { standingShort } from "./standingText";

interface EventsPeopleProps {
  people: EventPerson[];
  events: SocialEvent[];
  ledger: Map<string, Ledger>;
  today: string;
  words: EventWords;
  onOpenPerson: (id: string) => void;
}

const FILTERS: { value: PeopleFilter; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "they", label: "They gave more" },
  { value: "you", label: "You gave more" },
];
const COLUMNS = "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_110px_110px_190px_92px] items-center gap-x-3 px-4";

// The People page: everyone you have given to or had a gift from, what
// went each way, and where it stands.
export function EventsPeople({ people, events, ledger, today, words, onOpenPerson }: EventsPeopleProps) {
  const { t, money } = words;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PeopleFilter>("all");
  const rows = people
    .map((person) => ({ person, row: ledger.get(person.id), standing: standingOf(ledger.get(person.id)), latest: latestEventOf(person.id, events) }))
    .filter(({ person, standing }) => matchesPerson(person, query, standing, filter));

  return (
    <>
      <div className="flex flex-col gap-2.5 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-3.25 left-3.5 size-4.5 text-ink-muted" aria-hidden="true" />
          <input
            type="search"
            aria-label={t("Search people")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 w-full rounded-[12px] border border-input bg-surface pr-3.5 pl-10.5 text-[14.5px] text-ink outline-none focus-visible:border-emerald focus-visible:ring-3 focus-visible:ring-focus-ring"
          />
        </div>
        <div role="group" aria-label={t("Show")} className="flex h-11 gap-0.5 overflow-x-auto rounded-[12px] border border-input bg-surface p-[3px]">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={cn("rounded-[9px] px-3 text-small font-semibold whitespace-nowrap", filter === option.value ? "bg-emerald-soft text-emerald" : "text-ink-2 hover:text-ink")}
            >
              {t(option.label)}
            </button>
          ))}
        </div>
      </div>

      <section aria-label={t("People")} className="overflow-x-auto rounded-[18px] border border-line-card bg-surface shadow-card">
        <div className="min-w-[860px]">
          <div role="row" className={cn(COLUMNS, "h-[43px] border-b border-line-card bg-head-wash text-caption font-semibold tracking-[0.03em] text-ink-muted uppercase")}>
            <span role="columnheader">{t("Person")}</span>
            <span role="columnheader">{t("Latest event")}</span>
            <span role="columnheader" className="text-right">
              {t("You gave")}
            </span>
            <span role="columnheader" className="text-right">
              {t("They gave")}
            </span>
            <span role="columnheader">{t("Where it stands")}</span>
            <span role="columnheader" className="text-center">
              {t("View")}
            </span>
          </div>
          {rows.map(({ person, row, standing, latest }) => {
            const avatar = TINT[avatarTint(person.id)];
            const tint = STANDING_TINT[standing.kind];
            return (
              <div key={person.id} className={cn(COLUMNS, "min-h-[63px] border-b border-page")}>
                <span className="flex min-w-0 items-center gap-3">
                  <span className={cn("flex size-9.5 shrink-0 items-center justify-center rounded-full text-body font-bold", avatar.bg, avatar.fg)} aria-hidden="true">
                    {wordInitials(person.name)}
                  </span>
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="truncate text-[14.5px] font-semibold text-ink">{person.name}</span>
                    {person.relation && <span className="truncate text-[12.5px] text-ink-muted">{person.relation}</span>}
                  </span>
                </span>
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="truncate text-small text-ink-2">{latest ? latest.title : t("No events yet")}</span>
                  {latest && (
                    <span className="text-caption text-ink-faint">
                      {daysFrom(today, latest.date) >= 0 ? `${t("Coming up")} · ` : ""}
                      {words.day(latest.date)}
                    </span>
                  )}
                </span>
                <span className="text-right text-body font-semibold text-ink tabular-nums">{row?.gave ? money(row.gave) : "—"}</span>
                <span className="text-right text-body font-semibold text-ink tabular-nums">{row?.got ? money(row.got) : "—"}</span>
                <span>
                  <span className={cn("inline-flex rounded-full px-2.5 py-[3px] text-caption font-semibold whitespace-nowrap", tint.bg, tint.fg)}>{standingShort(standing, words)}</span>
                </span>
                <span className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => onOpenPerson(person.id)}
                    aria-label={t("View {name}", { name: person.name })}
                    className="h-8.5 rounded-full bg-primary px-3.5 text-[12.5px] font-semibold text-primary-foreground hover:bg-emerald-hover"
                  >
                    {t("View")}
                  </button>
                </span>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="p-7.5 text-center text-body text-ink-muted">{people.length ? t("No one matches that search.") : t("People appear here once you add an event or a gift.")}</div>
          )}
        </div>
      </section>
      <p className="text-[12.5px] text-ink-faint">{t("Item gifts count at the value you wrote down. \"Where it stands\" is only a guide; give what feels right.")}</p>
    </>
  );
}
