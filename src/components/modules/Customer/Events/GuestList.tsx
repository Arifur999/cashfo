"use client";

import { mineSummary, paisa } from "@/lib/customer/eventsDisplay";
import type { EventPerson, SocialEvent } from "@/lib/customer/eventsTypes";
import { typeLook } from "./eventVisuals";
import type { EventWords } from "./useEventWords";

// My events' Download list, as the page that prints: the event, its three
// figures, and who gave what (or whom you gave to), with the total.
export function GuestList({ event, people, words, today }: { event: SocialEvent; people: EventPerson[]; words: EventWords; today: string }) {
  const { t, money, count } = words;
  const summary = mineSummary(event);
  const nameOf = (id: string) => people.find((person) => person.id === id)?.name ?? "";
  return (
    <div className="flex flex-col gap-5 text-ink">
      <header className="flex flex-col gap-1 border-b border-line pb-4">
        <span className="text-caption font-semibold tracking-[0.06em] text-ink-muted uppercase">{t(typeLook(event.type).label)}</span>
        <h2 className="text-[22px] font-bold">{event.title}</h2>
        <span className="text-small text-ink-muted">{[words.day(event.date), event.time && words.clock(event.time), event.place].filter(Boolean).join(" · ")}</span>
      </header>
      <dl className="grid grid-cols-3 gap-3">
        {[
          { label: "Cash", value: money(summary.cash) },
          { label: "Gifts, at their value", value: money(summary.items) },
          { label: "People", value: count(summary.people) },
        ].map((tile) => (
          <div key={tile.label} className="flex flex-col gap-0.5 rounded-[10px] border border-line px-3 py-2.5">
            <dt className="text-caption text-ink-muted">{t(tile.label)}</dt>
            <dd className="text-body-lg font-bold tabular-nums">{tile.value}</dd>
          </div>
        ))}
      </dl>
      <table className="w-full border-collapse text-small">
        <thead>
          <tr className="border-b border-line text-left text-caption text-ink-muted uppercase">
            <th className="w-10 py-2 font-semibold">#</th>
            <th className="py-2 font-semibold">{t(summary.received ? "From" : "To")}</th>
            <th className="py-2 font-semibold">{t("Gift")}</th>
            <th className="py-2 text-right font-semibold">{t("Value")}</th>
          </tr>
        </thead>
        <tbody>
          {event.gifts.map((gift, index) => (
            <tr key={gift.id} className="border-b border-divider">
              <td className="py-2 text-ink-faint">{count(index + 1)}</td>
              <td className="py-2 font-semibold">{nameOf(gift.personId)}</td>
              <td className="py-2">{gift.kind === "ITEM" ? gift.item || t("Gift") : t("Cash")}</td>
              <td className="py-2 text-right tabular-nums">{money(paisa(gift.amount))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-3 font-semibold">
              {t("Total")}
            </td>
            <td className="pt-3 text-right font-bold tabular-nums">{money(summary.total)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="text-caption text-ink-faint">{t("Made with Smartly on {date}.", { date: words.day(today) })}</p>
    </div>
  );
}
