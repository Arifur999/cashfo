"use client";

import { CalendarDays, Plus, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import StatePanel from "@/components/smartly/StatePanel";
import { addGiftAction, createEventAction, deleteEventAction, deleteGiftAction, updateEventAction, updatePersonAction } from "@/lib/customer/eventActions";
import { byWhen, ledgerOf, mineSummary, paisa, suggestedOf } from "@/lib/customer/eventsDisplay";
import type { EventGift, EventPerson, EventsOverview, NewEventInput, NewGiftInput, SocialEvent } from "@/lib/customer/eventsTypes";
import type { CodeResult } from "@/lib/customer/codeCall";
import { PopupDialog } from "../Shared/PopupDialog";
import { PrintPreview } from "../Balance/PrintPreview";
import { AddEventDialog, type AddEventStart } from "./AddEventDialog";
import { EventDialog } from "./EventDialog";
import { EventsCalendar } from "./EventsCalendar";
import { EventsMine } from "./EventsMine";
import { EventsPeople } from "./EventsPeople";
import { GiftDialog, type GiftStart } from "./GiftDialog";
import { GuestList } from "./GuestList";
import { PersonDialog } from "./PersonDialog";
import { useEventWords } from "./useEventWords";

export type EventsView = "calendar" | "people" | "mine";

interface EventsPageClientProps {
  view: EventsView;
  businessId: string;
  overview: EventsOverview | null;
  today: string;
  // A day to open picked (?day=, after an invitation is added elsewhere).
  day: string | null;
  currency: string;
  canSee: boolean;
  readOnly: boolean;
}

const HEADS: Record<EventsView, { title: string; sub: string }> = {
  calendar: { title: "Calendar & Events", sub: "Invitations, your own events, and who gave what." },
  people: { title: "People", sub: "Who gave what, both ways, over the years." },
  mine: { title: "My events", sub: "Events you hosted, and what people gave." },
};

// Calendar & Events' three pages (Calendar, People, My events) and their
// popups: add an event, an event, a gift, a person, and the guest list to
// print. Every change is saved, then the page reads everything again.
export function EventsPageClient({ view, businessId, overview, today, day, currency, canSee, readOnly }: EventsPageClientProps) {
  const words = useEventWords(currency);
  const { t } = words;
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<AddEventStart | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [gift, setGift] = useState<GiftStart | null>(null);
  const [printing, setPrinting] = useState<SocialEvent | null>(null);
  const [confirming, setConfirming] = useState<SocialEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState(day ?? "");
  const [month, setMonth] = useState((day ?? today).slice(0, 7));
  const [mineId, setMineId] = useState<string | null>(null);

  const events = useMemo(() => overview?.events ?? [], [overview]);
  const people = useMemo(() => overview?.people ?? [], [overview]);
  const ledger = useMemo(() => ledgerOf(events), [events]);
  const mineEvents = useMemo(() => events.filter((event) => event.mine).sort((a, b) => byWhen(b, a)), [events]);
  const head = HEADS[view];

  if (!canSee || !overview) {
    return (
      <PageFrame className="gap-5">
        <PageHeader title={t(head.title)} />
        {!canSee ? (
          <StatePanel icon={<CalendarDays />} title={t("Only the owner or an accountant sees events")} description={t("Events and gifts are kept per workspace. Ask its owner, or open your own workspace.")} />
        ) : (
          <StatePanel
            icon={<CalendarDays />}
            tone="warning"
            title={t("Couldn't load your events.")}
            description={t("Check your connection and try again.")}
            action={
              <Button variant="secondary" disabled={isRefreshing} onClick={() => startRefresh(() => router.refresh())}>
                <RotateCw />
                {t("Try again")}
              </Button>
            }
          />
        )}
      </PageFrame>
    );
  }

  const openEvent = events.find((event) => event.id === eventId) ?? null;
  const openPerson = people.find((person) => person.id === personId) ?? null;
  const selectedMine = mineEvents.find((event) => event.id === mineId) ?? mineEvents[0] ?? null;

  // One change: saved, then everything read again. Answers what it wrote,
  // or null after the message is shown (or handed back with `quiet`).
  async function run<T>(call: () => Promise<CodeResult<T>>, fallback: string): Promise<{ data: T } | { error: string }> {
    setBusy(true);
    try {
      const result = await call().catch(() => null);
      if (result?.success) {
        startRefresh(() => router.refresh());
        return { data: result.data as T };
      }
      return { error: t(result?.message ?? fallback) };
    } finally {
      setBusy(false);
    }
  }

  const startAdd = (mine: boolean, on?: string) => setAdding({ mine, date: on || selectedDay || today });

  async function createEvent(input: NewEventInput): Promise<string | null> {
    const result = await run(() => createEventAction(businessId, input), "Couldn't save the event.");
    if ("error" in result) return result.error;
    setAdding(null);
    toast.success(input.remind ? `${t("Saved.")} ${t("We'll remind you a day before.")}` : t("Saved."));
    if (view === "mine" && input.mine) setMineId(result.data.id);
    else if (view === "calendar") {
      setMonth(input.date.slice(0, 7));
      setSelectedDay(input.date);
    } else router.push(`/events?day=${input.date}`);
    return null;
  }

  async function toggleRemind(event: SocialEvent) {
    const result = await run(() => updateEventAction(businessId, event.id, { remind: !event.remind }), "Couldn't save the event.");
    if ("error" in result) toast.error(result.error);
  }

  async function deleteEvent(event: SocialEvent) {
    const result = await run(() => deleteEventAction(businessId, event.id), "Couldn't delete the event.");
    if ("error" in result) return toast.error(result.error);
    setConfirming(null);
    setEventId(null);
    toast.success(t("Event deleted"));
  }

  async function saveGift(event: SocialEvent, input: NewGiftInput, walletName: string | null): Promise<string | null> {
    const result = await run(() => addGiftAction(businessId, event.id, input), "Couldn't save the gift.");
    if ("error" in result) return result.error;
    setGift(null);
    toast.success(walletName ? t("Gift saved, and {amount} added to Transactions from {wallet}", { amount: words.money(input.amount * 100), wallet: walletName }) : t("Gift saved"));
    return null;
  }

  async function deleteGift(row: EventGift) {
    const result = await run(() => deleteGiftAction(businessId, row.id), "Couldn't delete the gift.");
    if ("error" in result) return toast.error(result.error);
    toast.success(t(row.inTransactions ? "Gift deleted, and its expense taken out of Transactions" : "Gift deleted"));
  }

  async function savePerson(person: EventPerson, input: { name: string; relation: string | null }): Promise<string | null> {
    const result = await run(() => updatePersonAction(businessId, person.id, input), "Couldn't save this person.");
    if ("error" in result) return result.error;
    toast.success(t("Saved."));
    return null;
  }

  return (
    <PageFrame className="gap-5 leading-[normal] md:pt-7 md:pb-8">
      <PageHeader
        title={t(head.title)}
        description={t(head.sub)}
        className="md:items-center"
        actions={
          !readOnly && (
            <button
              type="button"
              onClick={() => startAdd(view === "mine")}
              className="flex h-10.5 items-center gap-1.75 rounded-full bg-primary px-4.5 text-body font-semibold whitespace-nowrap text-primary-foreground shadow-button hover:bg-emerald-hover"
            >
              <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
              {t(view === "mine" ? "Add my event" : "Add event")}
            </button>
          )
        }
      />

      {view === "calendar" && (
        <EventsCalendar
          events={events}
          people={people}
          ledger={ledger}
          today={today}
          words={words}
          readOnly={readOnly}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          month={month}
          onMonth={setMonth}
          onOpenEvent={setEventId}
          onAddOn={(on) => startAdd(false, on)}
        />
      )}
      {view === "people" && <EventsPeople people={people} events={events} ledger={ledger} today={today} words={words} onOpenPerson={setPersonId} />}
      {view === "mine" && (
        <EventsMine
          events={mineEvents}
          people={people}
          selected={selectedMine}
          words={words}
          readOnly={readOnly}
          onSelect={setMineId}
          onAdd={() => startAdd(true)}
          onAddGift={(event) => setGift({ event, direction: mineSummary(event).received ? "GOT" : "GAVE", personId: "", amount: 0 })}
          onDownload={setPrinting}
        />
      )}

      <AddEventDialog start={adding} people={people} busy={busy} onClose={() => setAdding(null)} onSave={createEvent} />
      <EventDialog
        event={openEvent}
        events={events}
        people={people}
        ledger={ledger}
        today={today}
        words={words}
        readOnly={readOnly}
        busy={busy}
        onClose={() => setEventId(null)}
        onToggleRemind={toggleRemind}
        onDelete={(event) => (event.gifts.length ? setConfirming(event) : void deleteEvent(event))}
        onWriteGift={(event, tip) => setGift({ event, direction: event.mine ? "GOT" : "GAVE", personId: event.mine ? "" : (event.hostId ?? ""), amount: suggestedOf(tip) })}
        onDeleteGift={deleteGift}
      />
      <GiftDialog start={gift} businessId={businessId} people={people} words={words} busy={busy} onClose={() => setGift(null)} onSave={saveGift} />
      <PersonDialog
        person={openPerson}
        events={events}
        ledger={ledger}
        today={today}
        words={words}
        readOnly={readOnly}
        busy={busy}
        onClose={() => setPersonId(null)}
        onOpenEvent={(id) => {
          setPersonId(null);
          setEventId(id);
        }}
        onSave={savePerson}
      />
      {confirming && (
        <PopupDialog
          open
          plain
          width={420}
          busy={busy}
          onClose={() => setConfirming(null)}
          title={t("Delete this event?")}
          sub={
            confirming.gifts.some((row) => row.inTransactions)
              ? t("Its {count} gifts go with it, and the cash you added to Transactions ({amount}) is taken out there too.", {
                  count: words.count(confirming.gifts.length),
                  amount: words.money(confirming.gifts.filter((row) => row.inTransactions).reduce((sum, row) => sum + paisa(row.amount), 0)),
                })
              : t("Its {count} gifts go with it.", { count: words.count(confirming.gifts.length) })
          }
          footer={
            <>
              <button type="button" onClick={() => setConfirming(null)} disabled={busy} className="h-10.5 rounded-full border border-input bg-surface px-4 text-body font-semibold text-ink hover:bg-surface-sunken disabled:opacity-50">
                {t("Cancel")}
              </button>
              <button type="button" onClick={() => void deleteEvent(confirming)} disabled={busy} className="h-10.5 rounded-full bg-expense-fill px-5 text-body font-semibold text-white hover:bg-expense disabled:opacity-50">
                {busy ? t("Deleting...") : t("Delete event")}
              </button>
            </>
          }
        />
      )}
      {printing && (
        <PrintPreview subtitle={`A4 · ${printing.title}`} onClose={() => setPrinting(null)}>
          <GuestList event={printing} people={people} words={words} today={today} />
        </PrintPreview>
      )}
    </PageFrame>
  );
}
