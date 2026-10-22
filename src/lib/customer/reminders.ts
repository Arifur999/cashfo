// Server-only readers for habit reminders and web push. User-scoped like
// lib/customer/habits.ts: no workspace in the path.
import { cache } from "react";
import { API_BASE_URL, type Book, type Habit, type HabitMonthTracker, type RemindersOverview, type SavedReminderKind, type Skill } from "./api";
import { customerApi } from "./apiClient";
import { emptyUnlessOutage } from "./readFallback";

// The master switch and every saved reminder; null when the API answers that
// there is nothing here (a backend from before reminders answers 404), so
// the page can tell "couldn't read" from "none yet". An outage throws to the
// error screen (readFallback.ts).
export const getReminders = cache(async (): Promise<RemindersOverview | null> => {
  try {
    const res = await customerApi.get<RemindersOverview>(`${API_BASE_URL}/api/reminders`);
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});

// The server's VAPID public key, which a device subscribes with; null when
// push isn't set up on the server (the bell still shows reminders).
export const getPushPublicKey = cache(async (): Promise<string | null> => {
  try {
    const res = await customerApi.get<{ publicKey: string | null }>(`${API_BASE_URL}/api/push/key`);
    return res.data.publicKey || null;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});

// The names of what reminders are about, by id: habits (archived too),
// challenges, books and skills -- only the kinds asked for. A list that can't
// be read just leaves its names out (the row then says "A habit"), so it
// never takes the page down.
export async function getReminderTargetNames(kinds: Iterable<SavedReminderKind>): Promise<Record<string, string>> {
  const wanted = new Set(kinds);
  const read = async <T>(want: boolean, path: string, params?: Record<string, string>): Promise<T | null> => {
    if (!want) return null;
    try {
      return (await customerApi.get<T>(`${API_BASE_URL}${path}`, { params })).data;
    } catch {
      return null;
    }
  };
  const [habits, challenges, books, skills] = await Promise.all([
    read<Habit[]>(wanted.has("HABIT"), "/api/habits", { includeArchived: "true" }),
    read<HabitMonthTracker[]>(wanted.has("CHALLENGE"), "/api/habit-trackers", { category: "Others" }),
    read<{ books: Book[] }>(wanted.has("BOOK"), "/api/books"),
    read<{ skills: Skill[] }>(wanted.has("SKILL"), "/api/skills"),
  ]);
  const names: Record<string, string> = {};
  for (const habit of habits ?? []) names[habit.id] = habit.name;
  for (const challenge of challenges ?? []) if (challenge.name) names[challenge.id] = challenge.name;
  for (const book of books?.books ?? []) names[book.id] = book.title;
  for (const skill of skills?.skills ?? []) names[skill.id] = skill.name;
  return names;
}
