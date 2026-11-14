"use client";

import { Bell, CalendarDays, Clock, Gift, Lightbulb, MapPin, User, X } from "lucide-react";
import { daysFrom, type Ledger, paisa, tipFor, type Tip } from "@/lib/customer/eventsDisplay";
import type { EventGift, EventPerson, SocialEvent } from "@/lib/customer/eventsTypes";
import { cn } from "@/lib/utils";
import { PopupDialog } from "../Shared/PopupDialog";
import { Switch } from "./EventControls";
import { POPUP, typeLook } from "./eventVisuals";
import type { EventWords } from "./useEventWords";

interface EventDialogProps {
  event: SocialEvent | null;
  events: SocialEvent[];
  people: EventPerson[];
  ledger: Map<string, Ledger>;
  today: string;
  words: EventWords;
  readOnly: boolean;
  busy: boolean;
  onClose: () => void;
  onToggleRemind: (event: SocialEvent) => void;
  onDelete: (event: SocialEvent) => void;
  onWriteGift: (event: SocialEvent, tip: Tip | null) => void;
  onDeleteGift: (gift: EventGift) => void;
}

// One event: when and where, whose, the "Last time" note before you give,
// the gifts written down, the reminder, and Delete / Write down a gift.
export function EventDialog({ event, events, people, ledger, today, words, readOnly, busy, onClose, onToggleRemind, onDelete, onWriteGift, onDeleteGift }: EventDialogProps) {
  if (!event) return null;
  const { t, money } = words;
  const look = typeLook(event.type);
  const days = daysFrom(today, event.date);
  const host = event.mine ? t("You") : (people.find((person) => person.id === event.hostId)?.name ?? "");
  const tip = !event.mine && days >= -1 ? tipFor(event, events, people, ledger) : null;
  const showTip = tip && !event.gifts.some((gift) => gift.direction === "GAVE");
  const nameOf = (id: string) => people.find((person) => person.id === id)?.name ?? "";
  const facts = [
    { Icon: CalendarDays, label: t("Date"), value: `${words.day(event.date)} · ${words.when(days)}` },
    { Icon: Clock, label: t("Time"), value: event.time ? words.clock(event.time) : "—" },
    { Icon: MapPin, label: t("Place"), value: event.place || "—" },
    { Icon: User, label: t("Whose event"), value: host },
  ];

  return (
    <PopupDialog
      open
      onClose={onClose}
      busy={busy}
      className={POPUP.className}
      closeClassName={POPUP.closeClassName}
      width={560}
      headClassName="items-start gap-3.5 px-6 py-5"
      lead={
        <span className={cn("flex size-11.5 shrink-0 items-center justify-center rounded-[14px]", look.bg, look.fg)}>
          <look.Icon className="size-5.5" aria-hidden="true" />
        </span>
      }
      title={
        <span className="flex flex-col items-start gap-[3px]">
          <span className={cn("rounded-full px-2 py-px text-[11.5px] font-semibold", look.bg, look.fg)}>{t(look.label)}</span>
          <span>{event.title}</span>
        </span>
      }
      titleClassName="text-[19px]"
      bodyClassName="gap-4 py-4.5"
      footerClassName="flex-nowrap"
      footer={
        <>
          {!readOnly && (
            <button type="button" onClick={() => onDelete(event)} disabled={busy} className="mr-auto text-[13.5px] font-semibold text-loss-ink hover:underline disabled:opacity-50">
              {t("Delete event")}
            </button>
          )}
          <button type="button" onClick={onClose} disabled={busy} className="h-10.5 rounded-full border border-input bg-surface px-4 text-body font-semibold text-ink hover:bg-surface-sunken disabled:opacity-50">
            {t("Close")}
          </button>
          {!readOnly && (
            <button type="button" onClick={() => onWriteGift(event, tip)} disabled={busy} className="flex h-10.5 items-center gap-1.5 rounded-full bg-primary px-4.5 text-body font-semibold whitespace-nowrap text-primary-foreground hover:bg-emerald-hover disabled:opacity-50">
              <Gift className="size-4" aria-hidden="true" />
              {t("Write down a gift")}
            </button>
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {facts.map(({ Icon, label, value }) => (
          <div key={label} className="flex items-center gap-2.5 rounded-[12px] bg-head-wash px-3 py-2.5">
            <Icon className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span className="flex min-w-0 flex-col">
              <span className="text-[11.5px] text-ink-faint">{label}</span>
              <span className="truncate text-[13.5px] font-semibold text-ink">{value}</span>
            </span>
          </div>
        ))}
      </div>

      {showTip && tip && (
        <div className="flex gap-2.5 rounded-[12px] border border-warning-line bg-warning-50 px-3.5 py-3 text-due-ink">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span className="flex flex-col gap-0.5">
            <span className="text-[13.5px] font-semibold">{tipHead(tip, words)}</span>
            <span className="text-small leading-normal">{tipText(tip, words)}</span>
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-[11.5px] font-semibold tracking-[0.06em] text-ink-muted uppercase">{t("Gifts")}</span>
        {event.gifts.map((gift) => (
          <div key={gift.id} className="flex items-center gap-2.5 rounded-[12px] border border-head-rule px-3 py-2.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap", gift.direction === "GAVE" ? "bg-tint-pink text-tint-pink-ink" : "bg-mint-50 text-brand-ink")}>
              {t(gift.direction === "GAVE" ? "You gave" : "You got")}
            </span>
            <span className="min-w-0 flex-1 text-[13.5px] text-ink-2">
              {gift.kind === "ITEM" ? gift.item || t("Gift") : t("Cash")} · {nameOf(gift.personId)}
              {gift.inTransactions && <span className="text-caption text-ink-faint"> · {t("in Transactions")}</span>}
            </span>
            <span className="text-body font-bold text-ink tabular-nums">{money(paisa(gift.amount))}</span>
            {!readOnly && (
              <button type="button" onClick={() => onDeleteGift(gift)} disabled={busy} aria-label={t("Delete this gift")} className="-mr-1 flex size-7 items-center justify-center rounded-full text-ink-faint hover:bg-surface-sunken hover:text-expense disabled:opacity-50">
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
        {event.gifts.length === 0 && <span className="text-[13.5px] text-ink-muted">{t("No gift written down yet.")}</span>}
      </div>

      <Switch checked={event.remind} onChange={() => onToggleRemind(event)} disabled={readOnly || busy} icon={<Bell className="size-4 text-ink-soft" aria-hidden="true" />} label={t("Remind me a day before")} />
    </PopupDialog>
  );
}

function tipHead(tip: Tip, { t }: EventWords): string {
  if (tip.kind === "noGift") return t("Gift");
  if (tip.kind === "first") return t("No history with {name} yet", { name: tip.name });
  return t("Last time");
}

function tipText(tip: Tip, { t, money }: EventWords): string {
  switch (tip.kind) {
    case "noGift":
      return t("A gift is not usually expected at a {event}. Most people give at the main event.", { event: t(tip.type === "MILAD" ? "Milad" : "Gaye Holud") });
    case "first":
      return t("Whatever you give this time will be the first entry.");
    case "gaveOnly":
      return t("You have given {name} {amount} before, and they have not given anything back yet.", { name: tip.name, amount: money(tip.gave) });
    case "last": {
      const amount = money(paisa(tip.gift.amount));
      const what = tip.gift.kind === "ITEM" && tip.gift.item ? t("a {item} (about {amount})", { item: tip.gift.item, amount }) : amount;
      const line = tip.at ? t("{name} gave {what} at {event}.", { name: tip.name, what, event: tip.at.title }) : "";
      const advice =
        tip.standing.kind === "they"
          ? t("Giving about {amount} keeps things even.", { amount: money(tip.standing.more) })
          : tip.standing.kind === "you"
            ? t("You have already given {amount} more, so a smaller gift is fine.", { amount: money(tip.standing.more) })
            : t("You are even right now.");
      return `${line} ${advice}`.trim();
    }
  }
}
