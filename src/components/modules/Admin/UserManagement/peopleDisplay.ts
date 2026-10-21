import { plural, type Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";

// Plain helpers for the people pages (Users, a person's page, Owners,
// Workspaces). Pure, so a Server Component and a hydrated client cell print
// the same words and digits.

// What kind of workspace a row names (the API's WorkspaceType).
export type WorkspaceKind = "PERSONAL" | "BUSINESS" | "GROUP";

// Every account's own workspace is stored under this name (the backend
// creates it so at sign-up), and the customer app never shows it as a name.
// Only a response without the workspace's kind is read by it.
export const PERSONAL_WORKSPACE_NAME = "Personal";

// The personal workspace is the one of type PERSONAL, whatever it is named;
// without a type (an older response) it is the one called "Personal".
export const isPersonalWorkspace = (name: string | null | undefined, type?: WorkspaceKind | null): boolean =>
  type == null ? name === PERSONAL_WORKSPACE_NAME : type === "PERSONAL";

// The admin shows the personal workspace in the reader's language; any
// other name is data and stays as written.
export const workspaceLabel = (
  name: string | null | undefined,
  t: Translate,
  personal: "Personal" | "Personal workspace" = "Personal",
  type?: WorkspaceKind | null,
): string | null => (name && isPersonalWorkspace(name, type) ? t(personal) : name || null);

// The workspace a person's row (on Users or Owners, or their page) names:
// newer responses say what kind it is in businessType.
export interface OwnWorkspaceFields {
  businessName: string | null;
  businessType?: WorkspaceKind | null;
}

export const ownWorkspaceLabel = (row: OwnWorkspaceFields, t: Translate, personal: "Personal" | "Personal workspace" = "Personal"): string | null =>
  workspaceLabel(row.businessName, t, personal, row.businessType);

// Every workspace a Workspaces row lists, oldest first: newer responses add
// each one's kind in workspaces, beside the plain workspaceNames.
export interface WorkspaceListFields {
  workspaceNames: string[];
  workspaces?: readonly { name: string; type?: WorkspaceKind | null }[];
}

export const workspaceNamesLabel = (row: WorkspaceListFields, t: Translate): string => {
  const workspaces: NonNullable<WorkspaceListFields["workspaces"]> = row.workspaces ?? row.workspaceNames.map((name) => ({ name }));
  return workspaces
    .map((workspace) => workspaceLabel(workspace.name, t, "Personal", workspace.type))
    .filter((name): name is string => name !== null)
    .join(", ");
};

const DAY_MS = 86_400_000;

// Whole days since a moment, never below 0: the backend's daysUsing. An
// unreadable date counts as today.
export const daysSince = (iso: string, now = Date.now()): number => {
  const days = Math.floor((now - new Date(iso).getTime()) / DAY_MS);
  return Number.isFinite(days) && days > 0 ? days : 0;
};

// How long someone has used Smartly: "12 days" ("১২ দিন" in the reader's
// digits), or "Joined today" on their first day instead of "0 days".
export const daysUsedLabel = (days: number, t: Translate, locale: Locale): string =>
  days > 0 ? plural(t, days, "{count} day", "{count} days", undefined, locale) : t("Joined today");

// The words behind the "+2" chip beside a person's own workspace.
export const moreWorkspacesLabel = (extra: number, t: Translate, locale: Locale): string =>
  plural(t, extra, "{count} more workspace", "{count} more workspaces", undefined, locale);
