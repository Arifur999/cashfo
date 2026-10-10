"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IPlatformSettings, IUpdatePlatformSettingsPayload } from "@/types/settings.types";

export const getPlatformSettings = async () => httpClient.get<IPlatformSettings>("/admin/settings");

export const updatePlatformSettings = async (payload: IUpdatePlatformSettingsPayload) =>
  httpClient.patch<IPlatformSettings>("/admin/settings", payload);
