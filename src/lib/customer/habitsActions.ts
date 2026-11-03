"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type Habit, type HabitFrequency, type HabitLog, type HabitMonthTracker, type PrayerStatus, type QazaSummary, type RamadanPrep, type RamadanPrepKey } from "./api";
import { DAY_ITEM, MAX_BACKFILL_DAYS } from "./challengeDisplay";
import type { PrayerSettings } from "./prayerTimes";
import { getAccessToken } from "@/lib/tokenUtils";
import { customerApi } from "./apiClient";

export interface ActionResult<T = void> {
  success: boolean;
  message?: string;
  data?: T;
}

async function authHeaders() {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${accessToken}` };
}

async function callApi<T>(fn: () => Promise<T>, fallbackMessage: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return { success: false, message: getApiErrorMessage(error.response?.data, fallbackMessage) };
    }
    return { success: false, message: fallbackMessage };
  }
}

export async function deleteHabitAction(id: string): Promise<ActionResult<{ id: string; action: "deleted" | "archived" }>> {
  return callApi(async () => {
    const res = await customerApi.delete<{ id: string; action: "deleted" | "archived" }>(`${API_BASE_URL}/api/habits/${id}`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove habit");
}

export async function checkInHabitAction(
  id: string,
  input: { date: string; completed?: boolean; value?: number; note?: string },
): Promise<ActionResult<HabitLog>> {
  return callApi(async () => {
    const res = await customerApi.post<HabitLog>(`${API_BASE_URL}/api/habits/${id}/check-in`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to check in");
}

export async function removeCheckInAction(id: string, date: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/habits/${id}/check-in`, { headers: await authHeaders(), params: { date } });
  }, "Failed to undo check-in");
}

// ---- Month trackers ("Create Month" sheets) ----

export async function createHabitTrackerAction(input: { category: string; month: number; year: number }): Promise<ActionResult<HabitMonthTracker>> {
  return callApi(async () => {
    const res = await customerApi.post<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to create month tracker");
}

// status: how a Namaz prayer was prayed (left out, a new mark is on time).
export async function setHabitTrackerCheckAction(
  id: string,
  input: { day: number; item: string; checked: boolean; status?: PrayerStatus },
): Promise<ActionResult<{ day: number; item: string; checked: boolean }>> {
  return callApi(async () => {
    const res = await customerApi.put<{ day: number; item: string; checked: boolean }>(`${API_BASE_URL}/api/habit-trackers/${id}/check`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to update");
}

// Ramadan: the paras read on one day (0 clears it); the server also ticks
// the sheet's Quran row.
// "I kept one": how many of a Ramadan sheet's missed fasts were made up.
export async function setFastsMadeUpAction(id: string, count: number): Promise<ActionResult<HabitMonthTracker>> {
  return callApi(async () => {
    const res = await customerApi.put<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers/${id}/fasts-made-up`, { count }, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the fast");
}

export async function saveRamadanPrepAction(year: number, items: RamadanPrepKey[]): Promise<ActionResult<RamadanPrep>> {
  return callApi(async () => {
    const res = await customerApi.put<RamadanPrep>(`${API_BASE_URL}/api/habit-trackers/ramadan-prep`, { year, items }, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the list");
}

export async function setRamadanParasAction(id: string, input: { day: number; paras: number }): Promise<ActionResult<{ day: number; paras: number }>> {
  return callApi(async () => {
    const res = await customerApi.put<{ day: number; paras: number }>(`${API_BASE_URL}/api/habit-trackers/${id}/paras`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to save the paras");
}

export async function deleteHabitTrackerAction(id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/habit-trackers/${id}`, { headers: await authHeaders() });
  }, "Failed to remove month tracker");
}

// ---- Ramadan sheets (a month tracker keyed by year, with editable habits) ----

export async function createRamadanTrackerAction(input: { year: number; days: 29 | 30 }): Promise<ActionResult<HabitMonthTracker>> {
  return callApi(async () => {
    const res = await customerApi.post<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers/ramadan`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to create Ramadan");
}

// ---- Others challenges (a named, day-count sheet -- any number can run at once) ----

export async function createCustomTrackerAction(input: { name: string; totalDays: number; startsTomorrow?: boolean }): Promise<ActionResult<HabitMonthTracker>> {
  return callApi(async () => {
    const res = await customerApi.post<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers/custom`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to create challenge");
}

export async function addTrackerItemAction(id: string, name: string): Promise<ActionResult<HabitMonthTracker>> {
  return callApi(async () => {
    const res = await customerApi.post<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers/${id}/items`, { name }, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save habit");
}

export async function removeTrackerItemAction(id: string, name: string): Promise<ActionResult<HabitMonthTracker>> {
  return callApi(async () => {
    const res = await customerApi.delete<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers/${id}/items`, { headers: await authHeaders(), params: { name } });
    return res.data;
  }, "Failed to remove habit");
}

// ---- Challenges: what takes the server several requests, in one call ----

const MAX_DAYS = 365;
const MAX_ITEMS = 20;
const isDay = (day: unknown): day is number => Number.isInteger(day) && (day as number) >= 1 && (day as number) <= MAX_DAYS;
const isItemList = (items: unknown): items is string[] => Array.isArray(items) && items.length <= MAX_ITEMS && items.every((item) => typeof item === "string");

// Adds the hidden day item to a challenge that has none yet: the server only
// ticks an item the sheet has. Already there (a second tab) is fine.
async function addDayItem(id: string, headers: Record<string, string>) {
  try {
    await customerApi.post(`${API_BASE_URL}/api/habit-trackers/${id}/items`, { name: DAY_ITEM }, { headers });
  } catch (error) {
    if (!(axios.isAxiosError(error) && error.response?.status === 409)) throw error;
  }
}

// Ticks a challenge's items on one day on or off, in order, stopping at the
// first refusal. addDayItem: the challenge is ticked through the day itself
// and has no item for it yet.
export async function setChallengeDayAction(id: string, input: { day: number; items: string[]; checked: boolean; addDayItem?: boolean }): Promise<ActionResult> {
  if (!isDay(input.day) || !isItemList(input.items)) return { success: false, message: "Failed to update" };
  return callApi(async () => {
    const headers = await authHeaders();
    if (input.addDayItem && input.checked) await addDayItem(id, headers);
    for (const item of input.items) {
      try {
        await customerApi.put(`${API_BASE_URL}/api/habit-trackers/${id}/check`, { day: input.day, item, checked: input.checked }, { headers });
      } catch (error) {
        // Unticking the day itself on a sheet that never had it: nothing to clear.
        if (input.addDayItem && !input.checked && axios.isAxiosError(error) && error.response?.status === 400) continue;
        throw error;
      }
    }
  }, "Failed to update");
}

// A new challenge with its daily items. A refused item still leaves the
// challenge made, so its sheet comes back with the error to open it anyway.
export async function createChallengeAction(input: { name: string; totalDays: number; items: string[]; startsTomorrow?: boolean }): Promise<ActionResult<HabitMonthTracker>> {
  if (!isItemList(input.items)) return { success: false, message: "Failed to create challenge" };
  const made = await createCustomTrackerAction({ name: input.name, totalDays: input.totalDays, ...(input.startsTomorrow && { startsTomorrow: true }) });
  if (!made.success || !made.data) return made;
  let tracker = made.data;
  for (const item of input.items) {
    const added = await addTrackerItemAction(tracker.id, item);
    if (!added.success || !added.data) return { success: false, message: added.message, data: tracker };
    tracker = added.data;
  }
  return { success: true, data: tracker };
}

// A new daily item on a challenge, ticked on every day already done (the
// days the client lists) so no done day turns missed. replaceDayItem: the
// challenge was ticked through the day itself; its ticks are now the new
// item's, so the hidden day item goes. Past MAX_BACKFILL_DAYS done days it
// is refused (the dialog says so first): the ticks would run into the
// server's request limit.
export async function addChallengeItemAction(id: string, input: { name: string; doneDays: number[]; replaceDayItem: boolean }): Promise<ActionResult<HabitMonthTracker>> {
  if (!Array.isArray(input.doneDays) || input.doneDays.length > MAX_BACKFILL_DAYS || !input.doneDays.every(isDay)) return { success: false, message: "Failed to add the row" };
  return callApi(async () => {
    const headers = await authHeaders();
    const res = await customerApi.post<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers/${id}/items`, { name: input.name }, { headers });
    // The name as the server saved it (trimmed, normalised).
    const wanted = input.name.trim().normalize("NFC").toLowerCase();
    const item = res.data.items.find((each) => each.toLowerCase() === wanted) ?? input.name.trim();
    try {
      for (const day of input.doneDays) {
        await customerApi.put(`${API_BASE_URL}/api/habit-trackers/${id}/check`, { day, item, checked: true }, { headers });
      }
    } catch (error) {
      // Ticked on only some of the done days, the new item would turn the
      // rest missed: it goes again, its ticks with it, so the sheet is as it
      // was (the day item untouched) and the refusal is reported. Best
      // effort: if this fails too, the row stays to be removed by hand.
      await customerApi.delete(`${API_BASE_URL}/api/habit-trackers/${id}/items`, { headers, params: { name: item } }).catch(() => undefined);
      throw error;
    }
    if (!input.replaceDayItem || !res.data.items.includes(DAY_ITEM)) return res.data;
    const after = await customerApi.delete<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers/${id}/items`, { headers, params: { name: DAY_ITEM } });
    return after.data;
  }, "Failed to add the row");
}

// Deletes a challenge with its days and ticks. The server deletes an Others
// challenge whole, ticks and all, in one transaction. A Namaz or Ramadan
// sheet is deleted only while nothing is ticked: this refuses them, so the
// challenge page can never take one away.
// "End challenge": it stops at today's day and moves to Not completed.
export async function endChallengeAction(id: string): Promise<ActionResult<HabitMonthTracker>> {
  return callApi(async () => {
    const res = await customerApi.post<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers/${id}/end`, {}, { headers: await authHeaders() });
    return res.data;
  }, "Failed to end the challenge");
}

// "Restart": day 1 is today again, its ticks cleared.
export async function restartChallengeAction(id: string): Promise<ActionResult<HabitMonthTracker>> {
  return callApi(async () => {
    const res = await customerApi.post<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers/${id}/restart`, {}, { headers: await authHeaders() });
    return res.data;
  }, "Failed to restart the challenge");
}

export async function deleteChallengeAction(id: string): Promise<ActionResult> {
  return callApi(async () => {
    const headers = await authHeaders();
    const { data: tracker } = await customerApi.get<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers/${id}`, { headers });
    if (tracker.category !== "Others") throw new Error("Not a challenge");
    await customerApi.delete(`${API_BASE_URL}/api/habit-trackers/${id}`, { headers });
  }, "Failed to remove challenge");
}

// ---- Daily habits ----

export interface HabitInput {
  name: string;
  icon?: string;
  color?: string;
  frequencyType?: HabitFrequency;
  weeklyDays?: number[];
  weeklyCount?: number;
  targetValue?: number | null;
  unit?: string | null;
}

export async function createHabitAction(input: HabitInput): Promise<ActionResult<Habit>> {
  return callApi(async () => {
    const res = await customerApi.post<Habit>(`${API_BASE_URL}/api/habits`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to add the habit");
}

export async function updateHabitAction(id: string, input: Partial<HabitInput> & { isArchived?: boolean }): Promise<ActionResult<Habit>> {
  return callApi(async () => {
    const res = await customerApi.patch<Habit>(`${API_BASE_URL}/api/habits/${id}`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to update the habit");
}

// Qaza: the prayers still owed and the ones made up.
export async function logQazaAction(prayer: string, count = 1): Promise<ActionResult<QazaSummary>> {
  return callApi(async () => {
    const res = await customerApi.post<QazaSummary>(`${API_BASE_URL}/api/namaz/qaza`, { prayer, count }, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the qaza");
}

export async function removeQazaAction(id: string): Promise<ActionResult<QazaSummary>> {
  return callApi(async () => {
    const res = await customerApi.delete<QazaSummary>(`${API_BASE_URL}/api/namaz/qaza/${id}`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove the qaza");
}

// since: "YYYY-MM-DD", the day qaza counting starts from.
export async function setQazaSinceAction(since: string): Promise<ActionResult<QazaSummary>> {
  return callApi(async () => {
    const res = await customerApi.put<QazaSummary>(`${API_BASE_URL}/api/namaz/qaza/since`, { since }, { headers: await authHeaders() });
    return res.data;
  }, "Failed to change the counting day");
}

export async function updatePrayerSettingsAction(input: Partial<PrayerSettings>): Promise<ActionResult<PrayerSettings>> {
  return callApi(async () => {
    const res = await customerApi.put<PrayerSettings>(`${API_BASE_URL}/api/namaz/settings`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the prayer settings");
}
