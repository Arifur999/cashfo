"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type Skill, type SkillStatus, type SkillUnit } from "./api";
import { getAccessToken } from "./tokenCookies";

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

export interface SkillCreateInput {
  name: string;
  source?: string;
  unit: SkillUnit;
  target: number;
  progress?: number;
  status?: SkillStatus;
  color?: string;
  icon?: string;
}

// The unit is fixed at creation, so it is not part of an update.
export type SkillUpdateInput = Partial<Omit<SkillCreateInput, "unit">>;

export async function createSkillAction(input: SkillCreateInput): Promise<ActionResult<Skill>> {
  return callApi(async () => {
    const res = await axios.post<Skill>(`${API_BASE_URL}/api/skills`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save skill");
}

// The same route edits the details, records progress and moves a skill
// between shelves (status).
export async function updateSkillAction(id: string, input: SkillUpdateInput): Promise<ActionResult<Skill>> {
  return callApi(async () => {
    const res = await axios.patch<Skill>(`${API_BASE_URL}/api/skills/${id}`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save skill");
}

export async function deleteSkillAction(id: string): Promise<ActionResult<{ id: string }>> {
  return callApi(async () => {
    const res = await axios.delete<{ id: string }>(`${API_BASE_URL}/api/skills/${id}`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove skill");
}

export async function setSkillGoalAction(target: number): Promise<ActionResult<{ year: number; goalTarget: number | null }>> {
  return callApi(async () => {
    const res = await axios.put<{ year: number; goalTarget: number | null }>(`${API_BASE_URL}/api/skills/goal`, { target }, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save goal");
}

export async function clearSkillGoalAction(): Promise<ActionResult<{ year: number; goalTarget: number | null }>> {
  return callApi(async () => {
    const res = await axios.delete<{ year: number; goalTarget: number | null }>(`${API_BASE_URL}/api/skills/goal`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save goal");
}
