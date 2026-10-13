// Server-only readers for the assets pages (and the dashboard's total), same
// shape as accounts.ts: an outage reaches the error screen instead of reading
// as "no assets yet" (see readFallback.ts). Client components keep using the
// actions in assetActions.ts.
import { cache } from "react";
import type { Asset, AssetCategoryOption } from "./api";
import { customerApi } from "./apiClient";
import { emptyUnlessOutage } from "./readFallback";

export const getAssets = cache(async (businessId: string): Promise<Asset[]> => {
  try {
    const response = await customerApi.get<Asset[]>(`/api/businesses/${businessId}/assets`);
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

export const getAssetCategories = cache(async (businessId: string): Promise<AssetCategoryOption[]> => {
  try {
    const response = await customerApi.get<AssetCategoryOption[]>(`/api/businesses/${businessId}/assets/categories`);
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});
