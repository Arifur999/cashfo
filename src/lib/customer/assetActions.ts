"use server";

import axios from "axios";
import { getAppToday } from "@/lib/date";
import { API_BASE_URL, getApiErrorMessage, type Asset, type AssetCategoryOption } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import type { ActionResult } from "./authActions";
import { customerApi } from "./apiClient";

async function authHeaders() {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${accessToken}` };
}

// Backend refusals the pages can say in the reader's language, matched by
// status and wording and answered with a dictionary key (the pages toast
// t(message)). Anything else passes through as the backend worded it.
const REFUSALS: { status?: number; pattern: RegExp; message: string }[] = [
  { status: 409, pattern: /asset category named/i, message: "An asset type with that name already exists" },
  // The drawer already stops a purchase a wallet can't cover; this is a
  // balance that changed in another tab meanwhile.
  { pattern: /only has .* cannot spend/i, message: "That wallet doesn't have enough money. Pick another wallet." },
  // Undo sale: the proceeds were spent from that wallet since the sale.
  { pattern: /only has .* the sale's .* can't be taken back/i, message: "The wallet the sale went into no longer holds that money, so the sale can't be undone." },
  { status: 409, pattern: /^this sale changed meanwhile/i, message: "This sale changed meanwhile. Reload and try again." },
  { pattern: /^account not found in this workspace$/i, message: "That wallet isn't in this workspace. Pick another wallet." },
  { status: 404, pattern: /^asset category not found$/i, message: "This asset type was already deleted." },
];

// The fallbacks are dictionary keys too: a network or session failure
// reaches the reader in their language.
async function callApi<T>(fn: () => Promise<T>, fallbackMessage: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = getApiErrorMessage(error.response?.data, fallbackMessage);
      const known = REFUSALS.find((refusal) => (refusal.status === undefined || refusal.status === error.response?.status) && refusal.pattern.test(message));
      return { success: false, message: known?.message ?? message };
    }
    return { success: false, message: fallbackMessage };
  }
}

export async function getAssetsAction(businessId: string): Promise<ActionResult<Asset[]>> {
  return callApi(async () => {
    const res = await customerApi.get<Asset[]>(`${API_BASE_URL}/api/businesses/${businessId}/assets`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to load assets");
}

export interface PurchaseAssetInput {
  name: string;
  category: string;
  purchaseDate: string;
  purchasePrice: number;
  // Omitted for something already owned (addOwnedAssetAction): a plain
  // record, no money moves -- see backend AssetsService.purchase()'s comment.
  purchaseAccountId?: string;
  notes?: string;
}

export async function purchaseAssetAction(businessId: string, input: PurchaseAssetInput): Promise<ActionResult<Asset>> {
  return callApi(async () => {
    const res = await customerApi.post<Asset>(`${API_BASE_URL}/api/businesses/${businessId}/assets`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to add the asset");
}

export interface AddOwnedAsset {
  asset: Asset;
  // False when the asset was saved but today's value wasn't.
  valueSaved: boolean;
}

// Something already owned: what was paid, on the day it was bought, then
// what it is worth today as a value check dated today. The backend files
// the price as the value on the purchase day, so without the check today's
// value would read as the price paid years ago, and the 6-month reminder
// would fire at once. valueToday is left out when there is nothing to add
// (bought today, at that value).
export async function addOwnedAssetAction(businessId: string, input: Omit<PurchaseAssetInput, "purchaseAccountId">, valueToday?: number): Promise<ActionResult<AddOwnedAsset>> {
  const added = await purchaseAssetAction(businessId, { ...input, purchaseAccountId: undefined });
  if (!added.success || !added.data) return { success: false, message: added.message };
  if (valueToday === undefined) return { success: true, data: { asset: added.data, valueSaved: true } };
  const checked = await updateAssetValueAction(businessId, added.data.id, { value: valueToday, date: getAppToday() });
  return { success: true, data: { asset: checked.data ?? added.data, valueSaved: checked.success } };
}

export interface SellAssetInput {
  soldPrice: number;
  soldAccountId: string;
  date: string;
  notes?: string;
}

export async function sellAssetAction(businessId: string, id: string, input: SellAssetInput): Promise<ActionResult<Asset>> {
  return callApi(async () => {
    const res = await customerApi.post<Asset>(`${API_BASE_URL}/api/businesses/${businessId}/assets/${id}/sell`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to record the sale");
}

export interface UpdateAssetValueInput {
  value: number;
  date: string;
  note?: string;
}

export async function updateAssetValueAction(businessId: string, id: string, input: UpdateAssetValueInput): Promise<ActionResult<Asset>> {
  return callApi(async () => {
    const res = await customerApi.post<Asset>(`${API_BASE_URL}/api/businesses/${businessId}/assets/${id}/value`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to update value");
}

// A correction to an asset entered wrongly. Only what is sent changes; null
// clears the note. The backend takes purchaseDate only for an owned asset
// no wallet paid for (a paid purchase keeps its posting's date), never
// later than a value recorded since, and says so otherwise.
export interface UpdateAssetInput {
  name?: string;
  category?: string;
  notes?: string | null;
  purchaseDate?: string;
}

export async function updateAssetAction(businessId: string, id: string, input: UpdateAssetInput): Promise<ActionResult<Asset>> {
  return callApi(async () => {
    const res = await customerApi.patch<Asset>(`${API_BASE_URL}/api/businesses/${businessId}/assets/${id}`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the changes");
}

// Takes away an asset entered by mistake, with its value history. A
// purchase paid from a wallet is voided with it, so the money is back in
// that wallet; a sold asset needs its sale undone first.
export async function deleteAssetAction(businessId: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/businesses/${businessId}/assets/${id}`, { headers: await authHeaders() });
  }, "Failed to delete the asset");
}

// Undoes a sale recorded by mistake: the sale's income leaves the wallet it
// went into, and the asset is owned again at the value it had.
export async function undoAssetSaleAction(businessId: string, id: string): Promise<ActionResult<Asset>> {
  return callApi(async () => {
    const res = await customerApi.post<Asset>(`${API_BASE_URL}/api/businesses/${businessId}/assets/${id}/undo-sale`, {}, { headers: await authHeaders() });
    return res.data;
  }, "Failed to undo the sale");
}

export async function getAssetCategoriesAction(businessId: string): Promise<ActionResult<AssetCategoryOption[]>> {
  return callApi(async () => {
    const res = await customerApi.get<AssetCategoryOption[]>(`${API_BASE_URL}/api/businesses/${businessId}/assets/categories`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to load asset types");
}

export interface AssetCategoryInput {
  name: string;
  icon?: string | null;
  color: string;
  isActive?: boolean;
}

export async function createAssetCategoryAction(businessId: string, input: AssetCategoryInput): Promise<ActionResult<AssetCategoryOption>> {
  return callApi(async () => {
    const res = await customerApi.post<AssetCategoryOption>(`${API_BASE_URL}/api/businesses/${businessId}/assets/categories`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the asset type");
}

export async function updateAssetCategoryAction(businessId: string, id: string, input: Partial<AssetCategoryInput>): Promise<ActionResult<AssetCategoryOption>> {
  return callApi(async () => {
    const res = await customerApi.patch<AssetCategoryOption>(`${API_BASE_URL}/api/businesses/${businessId}/assets/categories/${id}`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the asset type");
}

export async function deleteAssetCategoryAction(businessId: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/businesses/${businessId}/assets/categories/${id}`, { headers: await authHeaders() });
  }, "Failed to delete the asset type");
}
