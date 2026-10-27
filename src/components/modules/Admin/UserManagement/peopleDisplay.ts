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

// The Workspaces tile's note on a person's page: how their workspaces sit
// against what the plan includes (null = no limit).
export const workspacePlanLabel = (workspaces: number, limit: number | null, t: Translate, locale: Locale): string => {
  if (limit === null) return t("The plan has no limit");
  const extra = workspaces - limit;
  return extra > 0 ? plural(t, extra, "{count} more than the plan includes", "{count} more than the plan includes", undefined, locale) : t("Within the plan");
};

// The Wallets tile's note: "Cash, 2 banks, 1 mobile wallet".
export const walletKindsLabel = (kinds: { cash: number; bank: number; mfs: number; savings: number }, t: Translate, locale: Locale): string => {
  const parts = [
    kinds.cash === 1 ? t("Cash") : kinds.cash > 1 ? plural(t, kinds.cash, "{count} cash", "{count} cash", undefined, locale) : null,
    kinds.bank > 0 ? plural(t, kinds.bank, "{count} bank", "{count} banks", undefined, locale) : null,
    kinds.mfs > 0 ? plural(t, kinds.mfs, "{count} mobile wallet", "{count} mobile wallets", undefined, locale) : null,
    kinds.savings > 0 ? plural(t, kinds.savings, "{count} savings wallet", "{count} savings wallets", undefined, locale) : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(", ") : t("No wallets yet");
};

// A line of "What admins did on this account", as the person's page words
// it ("turned the account back on"), with the dot's colour: red for what
// locks or wipes, mint for what gives back, amber for money, blue for the
// rest. Another action reads by its audit label.
export type HistoryTone = "expense" | "income" | "warning" | "info";

const OWNER_HISTORY: Record<string, { text: string; tone: HistoryTone }> = {
  USER_SUSPENDED: { text: "suspended the account", tone: "expense" },
  USER_ACTIVATED: { text: "turned the account back on", tone: "income" },
  OWNER_PASSWORD_RESET: { text: "made a temporary password", tone: "info" },
  BUSINESS_PLAN_CHANGED: { text: "changed the plan", tone: "warning" },
  USER_PLAN_CHANGED: { text: "changed the plan", tone: "warning" },
  OWNER_DATA_RESET: { text: "reset the workspace data", tone: "expense" },
  OWNER_DATA_EXPORTED: { text: "downloaded a copy of the data", tone: "info" },
  OWNER_DELETION_CANCELLED: { text: "cancelled the account's deletion", tone: "income" },
  OWNER_SIGNED_OUT_EVERYWHERE: { text: "signed the account out of every device", tone: "info" },
  OWNER_TWO_STEP_DISABLED: { text: "turned off two-step verification", tone: "expense" },
  OWNER_NOTE_ADDED: { text: "added a note for admins", tone: "info" },
  OWNER_NOTE_DELETED: { text: "removed a note for admins", tone: "info" },
  USER_IMPERSONATION_STARTED: { text: "viewed the app as this customer", tone: "info" },
  USER_IMPERSONATION_ENDED: { text: "stopped viewing as this customer", tone: "info" },
  USER_IMPERSONATION_REFUSED: { text: "was refused a view as this customer", tone: "warning" },
};

export const ownerHistoryLine = (action: string): { text: string; tone: HistoryTone } | null => OWNER_HISTORY[action] ?? null;

// A device's icon: a phone or tablet by its label ("Chrome on Android",
// "Safari on iPhone"), a computer otherwise.
export const isPhoneDevice = (label: string | null | undefined): boolean => /android|iphone|ipad|ios|mobile|phone/i.test(label ?? "");

// The person page's tabs (?tab=), Overview first.
export const OWNER_TABS = ["overview", "billing", "activity", "support", "notes"] as const;
export type OwnerTab = (typeof OWNER_TABS)[number];

// ?tab= as the page reads it: Overview when absent or unknown.
export const ownerTabOf = (value: string | string[] | undefined): OwnerTab => {
  const raw = Array.isArray(value) ? value[0] : value;
  return OWNER_TABS.find((tab) => tab === raw) ?? "overview";
};
