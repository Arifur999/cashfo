"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IPlanAnalytics, IPlanPayload, ISubscriptionPlan } from "@/types/plan.types";

export const getPlans = async () => httpClient.get<ISubscriptionPlan[]>("/admin/plans");

export const getPlanAnalytics = async () => httpClient.get<IPlanAnalytics>("/admin/plans/analytics");

export const createPlan = async (payload: IPlanPayload) => httpClient.post<ISubscriptionPlan>("/admin/plans", payload);

export const updatePlan = async (id: string, payload: Partial<IPlanPayload>) =>
  httpClient.patch<ISubscriptionPlan>(`/admin/plans/${id}`, payload);

export const archivePlan = async (id: string) => httpClient.patch<ISubscriptionPlan>(`/admin/plans/${id}/archive`);

export const deletePlan = async (id: string) => httpClient.delete<void>(`/admin/plans/${id}`);
