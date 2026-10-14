import "server-only";
import { cache } from "react";
import { API_BASE_URL } from "./api";
import { customerApi } from "./apiClient";
import type { FeatureFlags } from "./features";

export type AnnouncementType = "INFO" | "WARNING" | "PROMOTION" | "MAINTENANCE";

export interface CustomerAnnouncement {
  id: string;
  title: string;
  titleBn: string | null;
  body: string;
  bodyBn: string | null;
  type: AnnouncementType;
  startAt: string;
  endAt: string | null;
}

export interface PublicPlatformInfo {
  platformName: string;
  supportEmail: string;
  maintenance: { enabled: boolean; message: string };
}

export interface PlatformInfo extends PublicPlatformInfo {
  flags: FeatureFlags;
  announcements: CustomerAnnouncement[];
}

export type LegalPage = "terms" | "privacy" | "refund-policy" | "faq";

export interface LegalDocument {
  type: string;
  contentEn: string;
  contentBn: string | null;
  version: number;
  updatedAt: string;
}

// When the API can't say (a blip, an older backend without these routes):
// the app as it was before these settings reached it -- open, every feature
// on, nothing announced. Never blocks a customer over a missing answer.
const FALLBACK_PUBLIC: PublicPlatformInfo = {
  platformName: "",
  supportEmail: "",
  maintenance: { enabled: false, message: "" },
};
const FALLBACK: PlatformInfo = { ...FALLBACK_PUBLIC, flags: {}, announcements: [] };

// What Admin > Settings, Feature Flags and Announcements say for the signed-in
// customer (GET /api/platform). One read per request, shared by the layout
// and any page that asks.
export const getPlatform = cache(async (): Promise<PlatformInfo> => {
  try {
    const res = await customerApi.get<PlatformInfo>(`${API_BASE_URL}/api/platform`);
    return res.data;
  } catch {
    return FALLBACK;
  }
});

// For pages anyone can open: no flags or announcements (they depend on who
// is asking). Plain fetch -- there is no token to send.
export const getPublicPlatform = cache(async (): Promise<PublicPlatformInfo> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/platform/public`, { cache: "no-store" });
    if (!res.ok) return FALLBACK_PUBLIC;
    return (await res.json()) as PublicPlatformInfo;
  } catch {
    return FALLBACK_PUBLIC;
  }
});

// A legal page as the admin last saved it (Admin > Content > Legal), or null
// when there isn't one.
export const getLegalDocument = cache(async (page: LegalPage): Promise<LegalDocument | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/platform/legal/${page}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as LegalDocument;
  } catch {
    return null;
  }
});
