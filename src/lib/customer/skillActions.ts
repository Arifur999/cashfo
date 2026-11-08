"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type PracticeEntry, type Skill, type SkillDetail, type SkillNote, type SkillResource, type SkillResourceKind, type SkillStatus, type SkillStep, type SkillUnit } from "./api";
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

const skillPath = (id: string, rest = "") => `${API_BASE_URL}/api/skills/${encodeURIComponent(id)}${rest}`;

export interface SkillCreateInput {
  name: string;
  source?: string;
  unit: SkillUnit;
  target: number;
  // What was done before it is tracked here, in the unit.
  base?: number;
  // The older name of `base`.
  progress?: number;
  status?: SkillStatus;
  // Learning, but put down for now.
  paused?: boolean;
  color?: string;
  icon?: string;
  category?: string;
  link?: string;
  why?: string;
  targetDate?: string | null;
}

// The unit changes only while no practice is logged (the server checks).
export type SkillUpdateInput = Partial<SkillCreateInput>;

export async function createSkillAction(input: SkillCreateInput): Promise<ActionResult<Skill>> {
  return callApi(async () => {
    const res = await customerApi.post<Skill>(`${API_BASE_URL}/api/skills`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save skill");
}

// The same route edits the details and moves a skill between shelves.
export async function updateSkillAction(id: string, input: SkillUpdateInput): Promise<ActionResult<Skill>> {
  return callApi(async () => {
    const res = await customerApi.patch<Skill>(skillPath(id), input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save skill");
}

// Deleted for a day (restoreSkillAction brings it back), then for good.
export async function deleteSkillAction(id: string): Promise<ActionResult<{ id: string }>> {
  return callApi(async () => {
    const res = await customerApi.delete<{ id: string }>(skillPath(id), { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove skill");
}

export async function restoreSkillAction(id: string): Promise<ActionResult<Skill>> {
  return callApi(async () => {
    const res = await customerApi.post<Skill>(skillPath(id, "/restore"), {}, { headers: await authHeaders() });
    return res.data;
  }, "Failed to bring the skill back");
}

// One day's practice, written or rewritten.
export async function logPracticeAction(id: string, date: string, input: { amount: number; note: string; finish: boolean }): Promise<ActionResult<{ skill: Skill; entry: PracticeEntry }>> {
  return callApi(async () => {
    const res = await customerApi.put<{ skill: Skill; entry: PracticeEntry }>(skillPath(id, `/practice/${date}`), input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the practice");
}

export async function removePracticeAction(id: string, date: string): Promise<ActionResult<Skill>> {
  return callApi(async () => {
    const res = await customerApi.delete<Skill>(skillPath(id, `/practice/${date}`), { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove the practice");
}

export async function addSkillStepAction(id: string, input: { title: string; position?: number; done?: boolean; doneOn?: string }): Promise<ActionResult<SkillStep>> {
  return callApi(async () => {
    const res = await customerApi.post<SkillStep>(skillPath(id, "/steps"), input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the step");
}

export async function updateSkillStepAction(id: string, stepId: string, input: { title?: string; done?: boolean }): Promise<ActionResult<SkillStep>> {
  return callApi(async () => {
    const res = await customerApi.patch<SkillStep>(skillPath(id, `/steps/${stepId}`), input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the step");
}

export async function moveSkillStepAction(id: string, stepId: string, direction: "up" | "down"): Promise<ActionResult<SkillStep[]>> {
  return callApi(async () => {
    const res = await customerApi.post<SkillStep[]>(skillPath(id, `/steps/${stepId}/move`), { direction }, { headers: await authHeaders() });
    return res.data;
  }, "Failed to move the step");
}

export async function removeSkillStepAction(id: string, stepId: string): Promise<ActionResult<{ id: string }>> {
  return callApi(async () => {
    const res = await customerApi.delete<{ id: string }>(skillPath(id, `/steps/${stepId}`), { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove the step");
}

export async function addSkillNoteAction(id: string, input: { title?: string; text: string; date?: string }): Promise<ActionResult<SkillNote>> {
  return callApi(async () => {
    const res = await customerApi.post<SkillNote>(skillPath(id, "/notes"), input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the note");
}

export async function updateSkillNoteAction(id: string, noteId: string, input: { title?: string; text?: string; date?: string }): Promise<ActionResult<SkillNote>> {
  return callApi(async () => {
    const res = await customerApi.patch<SkillNote>(skillPath(id, `/notes/${noteId}`), input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the note");
}

export async function removeSkillNoteAction(id: string, noteId: string): Promise<ActionResult<{ id: string }>> {
  return callApi(async () => {
    const res = await customerApi.delete<{ id: string }>(skillPath(id, `/notes/${noteId}`), { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove the note");
}

export async function addSkillResourceAction(id: string, input: { kind: SkillResourceKind; title: string; url: string }): Promise<ActionResult<SkillResource>> {
  return callApi(async () => {
    const res = await customerApi.post<SkillResource>(skillPath(id, "/resources"), input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the resource");
}

export async function updateSkillResourceAction(id: string, resourceId: string, input: { kind?: SkillResourceKind; title?: string; url?: string }): Promise<ActionResult<SkillResource>> {
  return callApi(async () => {
    const res = await customerApi.patch<SkillResource>(skillPath(id, `/resources/${resourceId}`), input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the resource");
}

export async function removeSkillResourceAction(id: string, resourceId: string): Promise<ActionResult<{ id: string }>> {
  return callApi(async () => {
    const res = await customerApi.delete<{ id: string }>(skillPath(id, `/resources/${resourceId}`), { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove the resource");
}

export async function setSkillGoalAction(target: number): Promise<ActionResult<{ year: number; goalTarget: number | null }>> {
  return callApi(async () => {
    const res = await customerApi.put<{ year: number; goalTarget: number | null }>(`${API_BASE_URL}/api/skills/goal`, { target }, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save goal");
}

export async function clearSkillGoalAction(): Promise<ActionResult<{ year: number; goalTarget: number | null }>> {
  return callApi(async () => {
    const res = await customerApi.delete<{ year: number; goalTarget: number | null }>(`${API_BASE_URL}/api/skills/goal`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save goal");
}

// The skill page's data, for a popup opened elsewhere (a day's note).
export async function loadSkillDetailAction(id: string): Promise<ActionResult<SkillDetail>> {
  return callApi(async () => {
    const res = await customerApi.get<SkillDetail>(skillPath(id), { headers: await authHeaders() });
    return res.data;
  }, "Failed to load the skill");
}
