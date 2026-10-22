"use client";

import type { SavedReminderKind } from "@/lib/customer/api";
import { cn } from "@/lib/utils";
import { ReminderEditor, type ReminderEditorProps } from "./ReminderEditor";
import { ReminderPushHint } from "./ReminderPushHint";
import type { ReminderBook } from "./useReminderBook";
import { useSavedReminder } from "./useSavedReminder";

type SavedReminderEditorProps = Omit<ReminderEditorProps, "value" | "onChange"> & {
  targetKey: string;
  book: ReminderBook;
};

// A ReminderEditor for something that already has an id: it saves itself as
// it changes (useSavedReminder) and tells the book what was kept. Give it
// key={targetKey}, so another habit gets a fresh one.
export function SavedReminderEditor({ kind, targetKey, book, defaultTime, disabled, ...rest }: SavedReminderEditorProps) {
  const reminder = useSavedReminder({ kind, targetKey, reminder: book.find(kind, targetKey), defaultTime, onSaved: book.remember });
  return <ReminderEditor kind={kind} value={reminder.draft} onChange={reminder.setDraft} defaultTime={defaultTime} disabled={disabled || book.readOnly} {...rest} />;
}

interface OffsetReminderRowsProps {
  kind: Extract<SavedReminderKind, "NAMAZ" | "RAMADAN">;
  // Each row: its key ("fajr", "sehri") and its words, already translated.
  rows: { key: string; label: React.ReactNode; description?: React.ReactNode }[];
  book: ReminderBook;
  // The rows' own grid, e.g. columns on a wide card.
  className?: string;
}

// A card's prayer (or Sehri/Iftar) rows, each saving itself, with one
// "notifications are off on this device" note under them while any is on.
export function OffsetReminderRows({ kind, rows, book, className }: OffsetReminderRowsProps) {
  const anyOn = rows.some((row) => book.find(kind, row.key)?.enabled);
  return (
    <div className="flex flex-col gap-3">
      <div className={cn("flex flex-col gap-3", className)}>
        {rows.map((row) => (
          <SavedReminderEditor key={row.key} kind={kind} targetKey={row.key} book={book} label={row.label} description={row.description} showPushHint={false} />
        ))}
      </div>
      {anyOn && <ReminderPushHint />}
    </div>
  );
}
