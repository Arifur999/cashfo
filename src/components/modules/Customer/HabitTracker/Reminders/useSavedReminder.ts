"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Reminder, SavedReminderKind } from "@/lib/customer/api";
import { draftFromReminder, reminderInput, type ReminderDraft } from "@/lib/customer/reminderDisplay";
import { saveReminderAction, type ActionResult } from "@/lib/customer/remindersActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const SAVE_AFTER_MS = 500;

// Saves a form's reminder once the thing it is for has an id. Null when there
// is nothing to save: it is off and was never saved.
export async function saveReminderDraft(kind: SavedReminderKind, targetKey: string, draft: ReminderDraft, saved?: Reminder | null): Promise<ActionResult<Reminder> | null> {
  if (!draft.enabled && !saved) return null;
  return saveReminderAction(reminderInput(kind, targetKey, draft));
}

interface UseSavedReminderOptions {
  kind: SavedReminderKind;
  targetKey: string;
  // The saved reminder for (kind, targetKey), or null/undefined for none yet.
  reminder: Reminder | null | undefined;
  defaultTime?: string;
  // After each successful save, with what the server kept.
  onSaved?: (reminder: Reminder) => void;
}

// A ReminderEditor that saves itself: `draft` and `setDraft` go to its
// value/onChange. Saved half a second after the last change (and straight
// away if the editor goes, a drawer closing); a failed save says so and puts
// back the last saved state.
export function useSavedReminder({ kind, targetKey, reminder, defaultTime, onSaved }: UseSavedReminderOptions) {
  const { t } = useLocale();
  const [draft, setDraftState] = useState<ReminderDraft>(() => draftFromReminder(kind, reminder, defaultTime));
  const [saving, setSaving] = useState(false);
  const saved = useRef<Reminder | null>(reminder ?? null);
  const pending = useRef<ReminderDraft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The latest of everything persist() reads, for the unmount flush.
  const latest = useRef({ kind, targetKey, defaultTime, onSaved, t });
  useEffect(() => {
    latest.current = { kind, targetKey, defaultTime, onSaved, t };
  });

  async function persist(next: ReminderDraft) {
    const { kind, targetKey, defaultTime, onSaved, t } = latest.current;
    const before = saved.current;
    setSaving(true);
    const result = await saveReminderDraft(kind, targetKey, next, before);
    setSaving(false);
    if (result === null) return;
    if (result.success && result.data) {
      saved.current = result.data;
      onSaved?.(result.data);
      return;
    }
    toast.error(t(result.message ?? "Failed to save the reminder"));
    setDraftState(draftFromReminder(kind, before, defaultTime));
  }

  function flush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    pending.current = null;
    if (next) void persist(next);
  }

  function setDraft(next: ReminderDraft) {
    setDraftState(next);
    pending.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_AFTER_MS);
  }

  // A change still waiting when the editor goes is saved now, not dropped.
  const flushOnUnmount = useRef(flush);
  useEffect(() => {
    flushOnUnmount.current = flush;
  });
  useEffect(() => () => flushOnUnmount.current(), []);

  return { draft, setDraft, saving };
}
