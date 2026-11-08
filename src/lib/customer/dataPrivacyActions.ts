"use server";

import { getAllWorkspaceUnlocks } from "@/lib/tokenUtils";
import { customerApi } from "./apiClient";
import { callCodeApi, type CodeResult } from "./codeCall";
import type { ImportRow } from "./dataImport";
import { getPrintableExport } from "./dataPrivacy";
import type { BackupSettings, BackupsPage, DataPrivacyPage, ImportResult, PrintableExport, PrivacySwitches, RestoreResult } from "./dataPrivacyTypes";

// Settings › Data & privacy: the privacy switches.
export async function savePrivacyAction(input: Partial<PrivacySwitches>): Promise<CodeResult<DataPrivacyPage>> {
  return callCodeApi(async () => (await customerApi.put<DataPrivacyPage>("/api/data-privacy", input)).data, "Couldn't save your privacy settings.");
}

export async function saveBackupSettingsAction(input: Partial<BackupSettings>): Promise<CodeResult<BackupsPage>> {
  return callCodeApi(async () => (await customerApi.put<BackupsPage>("/api/backups/settings", input)).data, "Couldn't save your backup settings.");
}

export async function backUpNowAction(): Promise<CodeResult<BackupsPage>> {
  return callCodeApi(async () => (await customerApi.post<BackupsPage>("/api/backups")).data, "Couldn't make a backup. Try again.");
}

// A workspace locked with a PIN is restored only when it is open on this
// device; the API names the ones it left.
export async function restoreBackupAction(backupId: string): Promise<CodeResult<RestoreResult>> {
  return callCodeApi(async () => {
    const unlocks = await getAllWorkspaceUnlocks();
    return (await customerApi.post<RestoreResult>(`/api/backups/${backupId}/restore`, undefined, { headers: unlocks ? { "x-workspace-unlock": unlocks } : undefined })).data;
  }, "Couldn't restore this backup. Nothing was changed.");
}

// One part of a file (at most IMPORT_CHUNK rows) into the open workspace.
export async function importRowsAction(businessId: string, input: { fileName: string; fileKey: string; rows: ImportRow[] }): Promise<CodeResult<ImportResult>> {
  return callCodeApi(async () => (await customerApi.post<ImportResult>(`/api/businesses/${businessId}/imports/transactions`, input)).data, "Couldn't import these rows. Try again.");
}

// The export as tables, for the print preview that saves a PDF.
export async function getPrintableExportAction(query: string): Promise<PrintableExport | null> {
  return getPrintableExport(new URLSearchParams(query));
}
