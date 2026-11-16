// Settings › Data & privacy: server-only readers. The page saves through
// dataPrivacyActions.ts.
import "server-only";
import { getAllWorkspaceUnlocks, getJournalUnlock } from "@/lib/tokenUtils";
import { customerApi } from "./apiClient";
import type { BackupsPage, DataPrivacyPage, ImportContext, PrintableExport } from "./dataPrivacyTypes";
import { emptyUnlessOutage } from "./readFallback";

// null when it can't be read (an older backend answers 404).
export async function getDataPrivacy(): Promise<DataPrivacyPage | null> {
  try {
    return (await customerApi.get<DataPrivacyPage>("/api/data-privacy")).data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
}

export async function getBackups(): Promise<BackupsPage | null> {
  try {
    return (await customerApi.get<BackupsPage>("/api/backups")).data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
}

// The open workspace's wallets and categories, for matching a file's rows;
// null for someone who may not add entries there.
export async function getImportContext(businessId: string): Promise<ImportContext | null> {
  try {
    return (await customerApi.get<ImportContext>(`/api/businesses/${businessId}/imports`)).data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
}

// The export as tables for the page that prints it. Every workspace opened
// with its PIN on this device comes in; the others are named, left out.
export async function getPrintableExport(query: URLSearchParams): Promise<PrintableExport | null> {
  try {
    const [unlocks, diaryUnlock] = await Promise.all([getAllWorkspaceUnlocks(), getJournalUnlock()]);
    const headers = { ...(unlocks && { "x-workspace-unlock": unlocks }), ...(diaryUnlock && { "x-journal-unlock": diaryUnlock }) };
    return (await customerApi.get<PrintableExport>(`/api/account/export/printable?${query.toString()}`, { headers })).data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
}
