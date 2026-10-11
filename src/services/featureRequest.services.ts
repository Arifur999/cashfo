"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { FeatureRequestStatus, IFeatureRequest } from "@/types/featureRequest.types";

// The list is small and unpaginated, so the table filters it in memory.
export const getFeatureRequests = async () => httpClient.get<IFeatureRequest[]>("/admin/feature-requests");

export const updateFeatureRequestStatus = async (id: string, status: FeatureRequestStatus) =>
  httpClient.patch<IFeatureRequest>(`/admin/feature-requests/${id}`, { status });
