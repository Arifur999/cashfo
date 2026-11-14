"use client";

import { CalendarDays, ChevronRight, Pencil } from "lucide-react";
import { useState } from "react";
import { avatarTint, daysFrom, historyOf, type Ledger, nextEventOf, paisa, STANDING_TINT, standingOf } from "@/lib/customer/eventsDisplay";
import type { EventPerson, SocialEvent } from "@/lib/customer/eventsTypes";
import { wordInitials } from "@/lib/customer/loanDisplay";
import { cn } from "@/lib/utils";
import { PopupDialog } from "../Shared/PopupDialog";
import { FIELD, LABEL } from "./AddEventDialog";
import { POPUP, TINT, typeLook } from "./eventVisuals";
import { standingLong } from "./standingText";
import type { EventWords } from "./useEventWords";

interface PersonDialogProps {
  person: EventPerson | null;
  events: SocialEvent[];
  ledger: Map<string, Ledger>;
  today: string;
  words: EventWords;
  readOnly: boolean;
  busy: boolean;
  onClose: () => void;
  onOpenEvent: (id: string) => void;
  // Answers an error to show, or null once saved.
  onSave: (person: EventPerson, input: { name: string; relation: string | null }) => Promise<string | null>;
}

// One person: what went each way, where it stands, their next event, and
// every gift between you, newest first. The pencil renames them or says
// how they are related.
export function PersonDialog(props: PersonDialogProps) {
  return props.person ? <PersonView key={props.person.id} {...props} person={props.person} /> : null;
}

function PersonView({ person, events, ledger, today, words, readOnly, busy, onClose, onOpenEvent, onSave }: PersonDialogProps & { person: EventPerson }) {
  const { t, money } = words;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(person.name);
  const [relation, setRelation] = useState(person.relation ?? "");
  const [error, setError] = useState<string | null>(null);
  const row = ledger.get(person.id) ?? { gave: 0, got: 0 };
  const standing = standingOf(row);
  const tint = STANDING_TINT[standing.kind];
  const avatar = TINT[avatarTint(person.id)];
  const first = person.name.trim().split(/\s+/)[0] ?? person.name;
  const next = nextEventOf(person.id, events, today);
  const history = historyOf(person.id, events);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError(t("Write their name."));
    const problem = await onSave(person, { name: name.trim(), relation: relation.trim() || null });
    if (problem) setError(problem);
    else setEditing(false);
  };

  return (
    <PopupDialog
      open
      onClose={onClose}
      busy={busy}
      className={POPUP.className}
      closeClassName={POPUP.closeClassName}
      subClassName="-mt-0.5 text-small"
      width={560}
      headClassName="items-center gap-3.5 px-6 py-5"
      lead={
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full text-[17px] font-bold", avatar.bg, avatar.fg)} aria-hidden="true">
          {wordInitials(person.name)}
        </span>
      }
      title={person.name}
      titleClassName="text-[19px]"
      sub={person.relation ?? undefined}
      actions={
        !readOnly &&
        !editing && (
          <button type="button" onClick={() => setEditing(true)} aria-label={t("Edit {name}", { name: person.name })} className="-my-1 flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken">
            <Pencil className="size-4" aria-hidden="true" />
          </button>
        )
      }
      onSubmit={editing ? save : undefined}
      bodyClassName="gap-4 pt-4.5 pb-5.5"
      footer={
        editing ? (
          <>
            <button type="button" onClick={() => (setEditing(false), setError(null))} disabled={busy} className="h-10.5 rounded-full border border-input bg-surface px-4 text-body font-semibold text-ink hover:bg-surface-sunken disabled:opacity-50">
              {t("Cancel")}
            </button>
            <button type="submit" disabled={busy} className="h-10.5 rounded-full bg-primary px-5 text-body font-semibold text-primary-foreground hover:bg-emerald-hover disabled:opacity-50">
              {busy ? t("Saving...") : t("Save")}
            </button>
          </>
        ) : undefined
      }
    >
      {editing ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>{t("Name")}</span>
            <input type="text" value={name} onChange={(event) => (setName(event.target.value), setError(null))} maxLength={60} autoFocus className={FIELD} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>
              {t("How you know them")} <span className="font-normal text-ink-faint">{t("(optional)")}</span>
            </span>
            <input type="text" value={relation} onChange={(event) => setRelation(event.target.value)} placeholder={t("Cousin, neighbour, colleague")} maxLength={40} className={FIELD} />
          </label>
          {error && (
            <div role="alert" className="rounded-[10px] bg-loss-wash px-3.5 py-2.5 text-small font-medium text-loss-ink">
              {error}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: t("You gave {name}", { name: first }), value: row.gave },
              { label: t("{name} gave you", { name: first }), value: row.got },
            ].map((tile) => (
              <div key={tile.label} className="flex flex-col gap-[3px] rounded-[14px] border border-head-rule bg-head-wash px-3.5 py-3">
                <span className="truncate text-[12.5px] text-ink-muted">{tile.label}</span>
                <span className="text-[20px] font-bold text-ink tabular-nums">{money(tile.value)}</span>
              </div>
            ))}
          </div>
          <div className={cn("rounded-[12px] px-3.5 py-3 text-[13.5px] font-medium", tint.bg, tint.fg)}>{standingLong(standing, person.name, words)}</div>
          {next && (
            <button type="button" onClick={() => onOpenEvent(next.id)} className="flex items-center gap-2.5 rounded-[12px] border border-line-card bg-surface px-3.5 py-3 text-left hover:bg-row-hover">
              <CalendarDays className="size-4.25 shrink-0 text-emerald" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-[13.5px] text-ink">
                {t("Next: {title}", { title: next.title })} · {words.day(next.date, false)} · {words.when(daysFrom(today, next.date))}
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
            </button>
          )}
          <div className="flex flex-col gap-1">
            <span className="pb-1 text-[11.5px] font-semibold tracking-[0.06em] text-ink-muted uppercase">{t("History")}</span>
            {history.map(({ gift, event }) => {
              const look = typeLook(event.type);
              return (
                <div key={gift.id} className="flex items-center gap-3 border-t border-page py-2.5">
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[10px]", look.bg, look.fg)}>
                    <look.Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="truncate text-[13.5px] font-semibold text-ink">{event.title}</span>
                    <span className="truncate text-[12.5px] text-ink-muted">
                      {words.day(event.date)} · {gift.kind === "ITEM" ? gift.item || t("Gift") : t("Cash")}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className={cn("rounded-full px-2 py-px text-[11.5px] font-semibold whitespace-nowrap", gift.direction === "GAVE" ? "bg-tint-pink text-tint-pink-ink" : "bg-mint-50 text-brand-ink")}>
                      {t(gift.direction === "GAVE" ? "You gave" : "They gave")}
                    </span>
                    <span className="text-body font-bold text-ink tabular-nums">{money(paisa(gift.amount))}</span>
                  </span>
                </div>
              );
            })}
            {history.length === 0 && <span className="text-[13.5px] text-ink-muted">{t("No gifts written down yet.")}</span>}
          </div>
        </>
      )}
    </PopupDialog>
  );
}
