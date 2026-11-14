"use client";

import { Bell } from "lucide-react";
import { useId, useState } from "react";
import { autoTitle, EVENT_TYPES } from "@/lib/customer/eventsDisplay";
import type { EventPerson, NewEventInput, SocialEventType } from "@/lib/customer/eventsTypes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PopupDialog } from "../Shared/PopupDialog";
import { POPUP, typeLook } from "./eventVisuals";
import { Segmented, Switch } from "./EventControls";

export interface AddEventStart {
  mine: boolean;
  date: string;
}

interface AddEventDialogProps {
  start: AddEventStart | null;
  people: EventPerson[];
  busy: boolean;
  onClose: () => void;
  // Answers an error to show, or null once it is saved.
  onSave: (input: NewEventInput) => Promise<string | null>;
}

export const FIELD = "h-11.5 w-full rounded-[12px] border border-input bg-surface px-3 text-[14.5px] text-ink outline-none placeholder:text-ink-faint focus-visible:border-emerald focus-visible:ring-3 focus-visible:ring-focus-ring aria-invalid:border-[1.5px] aria-invalid:border-expense-fill";
export const LABEL = "text-[13.5px] font-medium text-ink-2";

// The board's Add an event: invited or your own, its kind, whose it is
// (someone you know or a new name), a name made from those until you type
// one, the day, the time and place if you like, and the reminder.
export function AddEventDialog({ start, people, busy, onClose, onSave }: AddEventDialogProps) {
  return start ? <AddEventForm key={`${start.mine}:${start.date}`} start={start} people={people} busy={busy} onClose={onClose} onSave={onSave} /> : null;
}

function AddEventForm({ start, people, busy, onClose, onSave }: AddEventDialogProps & { start: AddEventStart }) {
  const { t } = useLocale();
  const id = useId();
  const [mine, setMine] = useState(start.mine);
  const [type, setType] = useState<SocialEventType>(start.mine ? "AQIQAH" : "WEDDING");
  const [host, setHost] = useState("");
  const [title, setTitle] = useState("");
  const [titleTyped, setTitleTyped] = useState(false);
  const [date, setDate] = useState(start.date);
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [remind, setRemind] = useState(true);
  const [error, setError] = useState<{ field: "host" | "title" | "date" | null; message: string } | null>(null);

  const shownTitle = titleTyped ? title : autoTitle(t, { mine, type, host });
  const change = (apply: () => void) => {
    apply();
    setError(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const hostName = host.trim();
    const name = shownTitle.trim();
    if (!mine && !hostName) return setError({ field: "host", message: t("Write whose event it is.") });
    if (!name) return setError({ field: "title", message: t("Give the event a name.") });
    if (!date) return setError({ field: "date", message: t("Pick a date.") });
    const known = people.find((person) => person.name.trim().toLowerCase() === hostName.toLowerCase());
    const problem = await onSave({
      type,
      title: name,
      date,
      ...(time && { time }),
      ...(place.trim() && { place: place.trim() }),
      mine,
      ...(!mine && (known ? { hostId: known.id } : { hostName })),
      remind,
    });
    if (problem) setError({ field: null, message: problem });
  };

  return (
    <PopupDialog
      open
      onClose={onClose}
      busy={busy}
      className={POPUP.className}
      closeClassName={POPUP.closeClassName}
      headClassName="items-center py-4.5"
      width={580}
      title={t("Add an event")}
      onSubmit={save}
      bodyClassName="gap-4 py-5"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="h-10.5 rounded-full border border-input bg-surface px-4 text-body font-semibold text-ink hover:bg-surface-sunken disabled:opacity-50">
            {t("Cancel")}
          </button>
          <button type="submit" disabled={busy} className="h-10.5 rounded-full bg-primary px-5 text-body font-semibold text-primary-foreground hover:bg-emerald-hover disabled:opacity-50">
            {busy ? t("Saving...") : t("Save event")}
          </button>
        </>
      }
    >
      <Segmented
        label={t("Whose event")}
        value={mine ? "mine" : "invited"}
        onChange={(value) => change(() => setMine(value === "mine"))}
        options={[
          { value: "invited", label: t("I'm invited") },
          { value: "mine", label: t("My own event") },
        ]}
      />
      <div className="flex flex-col gap-2">
        <span className={LABEL} id={`${id}-type`}>
          {t("What kind of event?")}
        </span>
        <div role="radiogroup" aria-labelledby={`${id}-type`} className="grid grid-cols-4 gap-2">
          {EVENT_TYPES.map((meta) => {
            const look = typeLook(meta.type);
            const on = type === meta.type;
            return (
              <button
                key={meta.type}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => change(() => setType(meta.type))}
                className={cn("flex flex-col items-center gap-1.5 rounded-[12px] px-1 py-2.5", on ? "border-[1.5px] border-primary bg-emerald-soft" : "border border-line-card bg-surface hover:bg-row-hover")}
              >
                <span className={cn("flex size-8 items-center justify-center rounded-[10px]", look.bg, look.fg)}>
                  <look.Icon className="size-4" aria-hidden="true" />
                </span>
                <span className={cn("text-[12.5px] text-ink", on ? "font-semibold" : "font-medium")}>{t(meta.label)}</span>
              </button>
            );
          })}
        </div>
      </div>
      {!mine && (
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t("Whose event is it?")}</span>
          <input
            type="text"
            list={`${id}-people`}
            value={host}
            onChange={(event) => change(() => setHost(event.target.value))}
            placeholder={t("Pick someone or type a new name")}
            maxLength={60}
            aria-invalid={error?.field === "host" || undefined}
            className={FIELD}
          />
          <datalist id={`${id}-people`}>
            {people.map((person) => (
              <option key={person.id} value={person.name} />
            ))}
          </datalist>
        </label>
      )}
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>{t("Event name")}</span>
        <input
          type="text"
          value={shownTitle}
          onChange={(event) =>
            change(() => {
              setTitle(event.target.value);
              setTitleTyped(true);
            })
          }
          placeholder={t("e.g. Sumaiya Apu's wedding")}
          maxLength={80}
          aria-invalid={error?.field === "title" || undefined}
          className={FIELD}
        />
      </label>
      <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t("Date")}</span>
          <input type="date" value={date} onChange={(event) => change(() => setDate(event.target.value))} aria-invalid={error?.field === "date" || undefined} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>
            {t("Time")} <span className="font-normal text-ink-faint">{t("(optional)")}</span>
          </span>
          <input type="time" value={time} onChange={(event) => change(() => setTime(event.target.value))} className={FIELD} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>
          {t("Place")} <span className="font-normal text-ink-faint">{t("(optional)")}</span>
        </span>
        <input type="text" value={place} onChange={(event) => change(() => setPlace(event.target.value))} placeholder={t("Community centre, home, area")} maxLength={120} className={FIELD} />
      </label>
      <Switch checked={remind} onChange={() => setRemind((on) => !on)} icon={<Bell className="size-4 text-ink-soft" aria-hidden="true" />} label={t("Remind me a day before")} />
      {error && (
        <div role="alert" className="rounded-[10px] bg-loss-wash px-3.5 py-2.5 text-small font-medium text-loss-ink">
          {error.message}
        </div>
      )}
    </PopupDialog>
  );
}
