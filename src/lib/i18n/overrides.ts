import "server-only";
import { cache } from "react";
import { API_BASE_URL } from "@/lib/axios/httpClient";
import type { TranslationOverrides } from "./translate";

// How long an admin's edit in Content > Translations takes to show.
const REVALIDATE_SECONDS = 60;

// The admin-edited Bangla, by English text (backend GET
// /api/platform/translations). Public and the same for everyone, so Next's
// data cache keeps it for a minute; cache() makes it one read per render.
// An outage just means the built-in dictionaries.
export const getTranslationOverrides = cache(async (): Promise<TranslationOverrides> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/platform/translations`, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!response.ok) {
      return {};
    }
    const body = (await response.json()) as { bn?: unknown };
    return body.bn && typeof body.bn === "object" ? (body.bn as TranslationOverrides) : {};
  } catch {
    return {};
  }
});
