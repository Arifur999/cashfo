"use server";

import type { AiSection, AiSettings } from "./aiInsightsTypes";
import { customerApi } from "./apiClient";
import { callCodeApi, type CodeResult } from "./codeCall";

// AI Insights on or off, what it may read, and the morning summary; the
// page then reads its report again (router.refresh).
export async function saveAiSettingsAction(input: { on?: boolean; reads?: AiSection[]; morning?: boolean }): Promise<CodeResult<AiSettings>> {
  return callCodeApi(async () => (await customerApi.put<AiSettings>("/api/insights/settings", input)).data, "Couldn't save your AI settings.");
}
