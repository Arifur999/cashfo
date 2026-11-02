"use server";

import { customerApi } from "./apiClient";
import { callCodeApi, type CodeResult } from "./codeCall";
import type { ZakatCheckStep, ZakatDebtMode, ZakatExtraInput, ZakatMetal, ZakatPaymentInput, ZakatSettingsInput, ZakatSummary } from "./zakatTypes";

// Every change answers the whole summary again, worked out afresh, so the
// page swaps it in without a second read.
export type ZakatResult = CodeResult<ZakatSummary>;

const enc = encodeURIComponent;
const base = (businessId: string) => `/api/businesses/${enc(businessId)}/zakat`;

export async function getZakatSummaryAction(businessId: string): Promise<ZakatResult> {
  return callCodeApi(async () => (await customerApi.get<ZakatSummary>(base(businessId))).data, "Couldn't load your zakat.");
}

export async function saveZakatSettingsAction(businessId: string, input: ZakatSettingsInput): Promise<ZakatResult> {
  return callCodeApi(async () => (await customerApi.patch<ZakatSummary>(`${base(businessId)}/settings`, input)).data, "Couldn't save the settings.");
}

// A line from the member's own pages counted or left out.
export async function setZakatLineAction(businessId: string, key: string, counted: boolean): Promise<ZakatResult> {
  return callCodeApi(async () => (await customerApi.put<ZakatSummary>(`${base(businessId)}/lines`, { key, counted })).data, "Couldn't change this line.");
}

export async function setZakatDebtModeAction(businessId: string, contactId: string, mode: ZakatDebtMode): Promise<ZakatResult> {
  return callCodeApi(async () => (await customerApi.put<ZakatSummary>(`${base(businessId)}/debts/${enc(contactId)}`, { mode })).data, "Couldn't change this debt.");
}

export async function setZakatForSaleAction(businessId: string, assetId: string, forSale: boolean): Promise<ZakatResult> {
  return callCodeApi(async () => (await customerApi.put<ZakatSummary>(`${base(businessId)}/assets/${enc(assetId)}/for-sale`, { forSale })).data, "Couldn't change this asset.");
}

// A gold or silver asset weighed (both null: valued as written in Assets).
export async function setZakatAssetWeightAction(businessId: string, assetId: string, metal: ZakatMetal | null, weightVori: number | null): Promise<ZakatResult> {
  return callCodeApi(async () => (await customerApi.put<ZakatSummary>(`${base(businessId)}/assets/${enc(assetId)}/weight`, { metal, weightVori })).data, "Couldn't save the weight.");
}

export async function setZakatCheckedAction(businessId: string, step: ZakatCheckStep, checked: boolean): Promise<ZakatResult> {
  return callCodeApi(async () => (await customerApi.put<ZakatSummary>(`${base(businessId)}/checked`, { step, checked })).data, "Couldn't save this step.");
}

export async function addZakatExtraAction(businessId: string, input: ZakatExtraInput): Promise<ZakatResult> {
  return callCodeApi(async () => (await customerApi.post<ZakatSummary>(`${base(businessId)}/extras`, input)).data, "Couldn't add it.");
}

export async function removeZakatExtraAction(businessId: string, id: string): Promise<ZakatResult> {
  return callCodeApi(async () => (await customerApi.delete<ZakatSummary>(`${base(businessId)}/extras/${enc(id)}`)).data, "Couldn't remove it.");
}

// Zakat given: an expense under Zakat from one wallet.
export async function recordZakatAction(businessId: string, input: ZakatPaymentInput): Promise<ZakatResult> {
  return callCodeApi(async () => (await customerApi.post<ZakatSummary>(`${base(businessId)}/payments`, input)).data, "Couldn't save the zakat you gave.");
}

// Deleting it voids its expense too.
export async function deleteZakatPaymentAction(businessId: string, id: string): Promise<ZakatResult> {
  return callCodeApi(async () => (await customerApi.delete<ZakatSummary>(`${base(businessId)}/payments/${enc(id)}`)).data, "Couldn't delete this entry.");
}
