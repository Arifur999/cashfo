"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { ICreateFeatureFlagPayload, IFeatureFlag, IUpdateFeatureFlagPayload } from "@/types/featureFlag.types";

const BASE = "/admin/system/feature-flags";

// Sorted by key.
export const getFeatureFlags = async () => httpClient.get<IFeatureFlag[]>(BASE);

export const createFeatureFlag = async (payload: ICreateFeatureFlagPayload) => httpClient.post<IFeatureFlag>(BASE, payload);

export const updateFeatureFlag = async (id: string, payload: IUpdateFeatureFlagPayload) =>
  httpClient.patch<IFeatureFlag>(`${BASE}/${id}`, payload);
