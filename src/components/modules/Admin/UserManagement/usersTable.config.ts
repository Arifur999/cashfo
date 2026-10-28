import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { enumTabs } from "@/lib/statusBadge";
import { OWNER_STATUSES, type OwnerStatus } from "@/types/owner.types";

// The status tabs, each with its count. "Deleting soon" (an account inside
// its 30 days after Delete my account) only shows while someone is in it,
// or while it is the tab open, so the boards' Active · Suspended · Deleted
// stays the usual row.
export const ownerStatusTabs = (statusCounts?: Record<OwnerStatus, number>, open?: string | null) =>
  enumTabs(
    OWNER_STATUSES.filter((status) => status !== "PENDING_DELETION" || (statusCounts?.PENDING_DELETION ?? 0) > 0 || open === status),
    statusCounts,
  ).map((tab) => (tab.value === "PENDING_DELETION" ? { ...tab, label: OWNER_STATUS_LABEL.PENDING_DELETION ?? tab.label } : tab));

// How an owner's status reads where the plain enum name wouldn't.
export const OWNER_STATUS_LABEL: Partial<Record<OwnerStatus, string>> = { PENDING_DELETION: "Deleting soon" };
import type { IPlanOption } from "@/types/plan.types";

// What the page needs to build the identical query string on the server.
// The list opens with the most recently active first ("lastActive": the
// last sign-in, as the API names it, in the URL too).
export const USERS_TABLE_BASE_CONFIG = {
  queryKeys: ["search", "status", "planId", "joined", "lastActive", "workspaces", "sort"],
  defaults: { sort: "lastActive" },
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaults">;

// The board's chips under the tabs: plan, when they joined, when they were
// last active and how many workspaces they own, then the order on the right.
const JOINED_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];
const LAST_ACTIVE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "over30d", label: "Not in 30 days" },
  { value: "never", label: "Never" },
];
const WORKSPACE_OPTIONS = [
  { value: "1", label: "Just one" },
  { value: "2+", label: "2 or more" },
  { value: "3+", label: "3 or more" },
];
const SORT_OPTIONS = [
  { value: "lastActive", label: "Last active, newest first" },
  { value: "joined", label: "Joined, newest first" },
  { value: "name", label: "Name, A to Z" },
];

// The plan filter's options come from the API and the status tabs' counts
// from the list response, so the full config is built once those are
// loaded (memoize the result -- it must stay stable).
export const buildUsersTableConfig = (plans: IPlanOption[], statusCounts?: Record<OwnerStatus, number>, openStatus?: string | null): ServerDataTableConfig => ({
  ...USERS_TABLE_BASE_CONFIG,
  search: { placeholder: "Search name, email, phone or workspace" },
  filters: [
    { id: "status", type: "tabs", label: "Status", options: ownerStatusTabs(statusCounts, openStatus) },
    // A plan's name is data ("Business"), never a word to translate.
    { id: "planId", type: "single-select", label: "Plan", allLabel: "All plans", options: plans.map((plan) => ({ value: plan.id, label: plan.name, raw: true })) },
    // "Joined@@date" is the date they joined (যোগদান), not "has joined".
    { id: "joined", type: "single-select", label: "Joined@@date", allLabel: "Any time", options: JOINED_OPTIONS },
    { id: "lastActive", type: "single-select", label: "Last active", allLabel: "Any time", options: LAST_ACTIVE_OPTIONS },
    { id: "workspaces", type: "single-select", label: "Workspaces", allLabel: "Any number", options: WORKSPACE_OPTIONS },
    { id: "sort", type: "sort", label: "Sort", options: SORT_OPTIONS },
  ],
});
