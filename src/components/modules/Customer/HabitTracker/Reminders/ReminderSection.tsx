"use client";

import type { TimedReminderKind } from "@/lib/customer/api";
import type { ReminderDraft } from "@/lib/customer/reminderDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ReminderEditor } from "./ReminderEditor";
import { SavedReminderEditor } from "./SavedReminderEditor";
import type { ReminderBook } from "./useReminderBook";

interface ReminderSectionProps {
  kind: TimedReminderKind;
  // The habit's (challenge's, book's, skill's) id while editing: the
  // reminder then saves as it changes. Null while it is being created: the
  // form keeps `draft` and saves it with saveDraft once there is an id.
  targetKey: string | null;
  book: ReminderBook;
  draft: ReminderDraft;
  onDraftChange: (next: ReminderDraft) => void;
  // A line under "Remind me" while creating, already translated.
  description?: React.ReactNode;
  className?: string;
}

// A drawer's or dialog's reminder, in the same strip box as the forms'
// other switches. Nothing when the reminders couldn't be read.
export function ReminderSection({ kind, targetKey, book, draft, onDraftChange, description, className }: ReminderSectionProps) {
  const { t } = useLocale();
  if (!book.available) return null;
  return (
    <div className={cn("rounded-[10px] border border-line bg-strip p-4", className)}>
      {targetKey ? (
        <SavedReminderEditor key={targetKey} kind={kind} targetKey={targetKey} book={book} description={t("Saved as you change it.")} />
      ) : (
        <ReminderEditor kind={kind} value={draft} onChange={onDraftChange} description={description} disabled={book.readOnly} />
      )}
    </div>
  );
}
