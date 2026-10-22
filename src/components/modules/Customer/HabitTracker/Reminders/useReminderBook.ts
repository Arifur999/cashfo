"use client";

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import type { Reminder, SavedReminderKind } from "@/lib/customer/api";
import type { ReminderDraft } from "@/lib/customer/reminderDisplay";
import { saveReminderDraft } from "./useSavedReminder";

// A screen's saved reminders: what its server page read (getReminders()),
// plus whatever was saved since, so a drawer opened again shows the latest
// without a refresh.
export interface ReminderBook {
  // False when the reminders couldn't be read (null from the reader): the
  // screen leaves its reminder editors out rather than offer what can't be
  // saved.
  available: boolean;
  // A "View as customer" session can look but not change.
  readOnly: boolean;
  find: (kind: SavedReminderKind, targetKey: string) => Reminder | null;
  remember: (reminder: Reminder) => void;
  // A form's draft, saved once its habit/challenge/book/skill has an id.
  // Success too when there was nothing to save (off, never saved).
  saveDraft: (kind: SavedReminderKind, targetKey: string, draft: ReminderDraft) => Promise<{ success: boolean; message?: string }>;
}

const keyOf = (kind: string, targetKey: string) => `${kind}:${targetKey}`;
// The later of two copies of one reminder ("updatedAt" is ISO, so it sorts).
const later = (a: Reminder | undefined, b: Reminder | undefined) => (!a ? b : !b ? a : a.updatedAt >= b.updatedAt ? a : b);

export function useReminderBook(reminders: Reminder[] | null): ReminderBook {
  const { user } = useAuth();
  const [saved, setSaved] = useState<Record<string, Reminder>>({});
  const fromServer = useMemo(() => new Map((reminders ?? []).map((reminder) => [keyOf(reminder.kind, reminder.targetKey), reminder])), [reminders]);

  const find = useCallback((kind: SavedReminderKind, targetKey: string) => {
    const key = keyOf(kind, targetKey);
    return later(fromServer.get(key), saved[key]) ?? null;
  }, [fromServer, saved]);

  const remember = useCallback((reminder: Reminder) => setSaved((prev) => ({ ...prev, [keyOf(reminder.kind, reminder.targetKey)]: reminder })), []);

  const saveDraft = useCallback(
    async (kind: SavedReminderKind, targetKey: string, draft: ReminderDraft) => {
      const result = await saveReminderDraft(kind, targetKey, draft, find(kind, targetKey));
      if (result === null) return { success: true };
      if (result.success && result.data) remember(result.data);
      return { success: result.success, message: result.message };
    },
    [find, remember],
  );

  return { available: reminders !== null, readOnly: Boolean(user.impersonatedBy), find, remember, saveDraft };
}
