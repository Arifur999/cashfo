"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type Asset, type AssetCategory } from "./api";
import { getAccessToken } from "./tokenCookies";
import type { ActionResult } from "./authActions";

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

export async function getAssetsAction(businessId: string): Promise<ActionResult<Asset[]>> {
  return callApi(async () => {
    const res = await axios.get<Asset[]>(`${API_BASE_URL}/api/businesses/${businessId}/assets`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to load assets");
}

export interface PurchaseAssetInput {
  name: string;
  category: AssetCategory;
  purchaseDate: string;
  purchasePrice: number;
  // Omitted by "Current Asset list"'s simpler Add Assets flow (AddCurrentAssetModal)
  // -- see backend AssetsService.purchase()'s comment for what that skips.
  purchaseAccountId?: string;
  notes?: string;
}

export async function purchaseAssetAction(businessId: string, input: PurchaseAssetInput): Promise<ActionResult<Asset>> {
  return callApi(async () => {
    const res = await axios.post<Asset>(`${API_BASE_URL}/api/businesses/${businessId}/assets`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to purchase asset");
}

export interface SellAssetInput {
  soldPrice: number;
  soldAccountId: string;
  date: string;
  notes?: string;
}

export async function sellAssetAction(businessId: string, id: string, input: SellAssetInput): Promise<ActionResult<Asset>> {
  return callApi(async () => {
    const res = await axios.post<Asset>(`${API_BASE_URL}/api/businesses/${businessId}/assets/${id}/sell`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to sell asset");
}

export interface UpdateAssetValueInput {
  value: number;
  note?: string;
}

export async function updateAssetValueAction(businessId: string, id: string, input: UpdateAssetValueInput): Promise<ActionResult<Asset>> {
  return callApi(async () => {
    const res = await axios.post<Asset>(`${API_BASE_URL}/api/businesses/${businessId}/assets/${id}/value`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to update asset value");
}
