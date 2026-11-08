// Settings › Data & privacy as the API sends it. Shared by the server
// readers (dataPrivacy.ts), the actions and the page.
import type { AiSection } from "./aiInsightsTypes";

export type ExportSection = "balance" | "ie" | "budget" | "savings" | "loans" | "assets" | "group" | "events";
export type ExportFormat = "csv" | "excel" | "pdf";

export interface DataPrivacyPage {
  glance: { transactions: number; accounts: number; goals: number; loanContacts: number; assets: number; groups: number; events: number };
  privacy: PrivacySwitches;
  ai: { on: boolean; reads: AiSection[] };
}

export interface PrivacySwitches {
  shareUsage: boolean;
  showNameInGroups: boolean;
  marketingEmails: boolean;
}

export interface BackupRow {
  id: string;
  kind: "AUTO" | "MANUAL" | "BEFORE_RESTORE";
  createdAt: string;
  // Bytes stored.
  size: number;
  workspaces: number;
}

export interface BackupSettings {
  auto: boolean;
  every: "daily" | "weekly";
  keep: number;
}

export interface BackupsPage {
  settings: BackupSettings;
  backups: BackupRow[];
  // Bytes: every backup kept, and the records the newest one holds.
  storage: { backups: number; records: number | null };
}

export interface RestoreResult {
  restored: number;
  locked: string[];
  undoId: string;
  takenAt: string;
}

export interface ImportContext {
  wallets: string[];
  categories: { income: string[]; expense: string[] };
  imported: number;
}

export interface ImportResult {
  added: number;
  already: number;
  skipped: { row: number; reason: string }[];
}

export interface PrintableExport {
  owner: string;
  folders: { folder: string; sheets: { name: string; head: string[]; rows: string[][]; more: number }[] }[];
  locked: string[];
}
