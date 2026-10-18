import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { enumTabs } from "@/lib/statusBadge";
import { OWNER_STATUSES, type OwnerStatus } from "@/types/owner.types";
import type { IPlanOption } from "@/types/plan.types";

// What the page needs to build the identical query string on the server.
// The list opens with the most recently active people first.
export const USERS_TABLE_BASE_CONFIG = {
  queryKeys: ["search", "status", "planId", "joined", "lastActive", "workspaces", "sort"],
  defaults: { sort: "lastActive" },
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaults">;

// The board's chips under the tabs: plan, when they joined, when they were
// last here and how many workspaces they own, then the order on the right.
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
export const buildUsersTableConfig = (plans: IPlanOption[], statusCounts?: Record<OwnerStatus, number>): ServerDataTableConfig => ({
  ...USERS_TABLE_BASE_CONFIG,
  search: { placeholder: "Search name, email, phone or workspace" },
  filters: [
    { id: "status", type: "tabs", label: "Status", options: enumTabs(OWNER_STATUSES, statusCounts) },
    { id: "planId", type: "single-select", label: "Plan", allLabel: "All plans", options: plans.map((plan) => ({ value: plan.id, label: plan.name })) },
    { id: "joined", type: "single-select", label: "Joined", allLabel: "Any time", options: JOINED_OPTIONS },
    { id: "lastActive", type: "single-select", label: "Last active", allLabel: "Any time", options: LAST_ACTIVE_OPTIONS },
    { id: "workspaces", type: "single-select", label: "Workspaces", allLabel: "Any number", options: WORKSPACE_OPTIONS },
    { id: "sort", type: "sort", label: "Sort", options: SORT_OPTIONS },
  ],
});
