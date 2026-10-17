import type { Severity } from "@/types/securityFlag.types";
import type { ErrorSource, IErrorLog } from "@/types/system.types";
import { formatLogTime } from "./date";

export const ERROR_SOURCE_LABEL: Record<ErrorSource, string> = {
  BACKEND_API: "Server",
  ADMIN_FRONTEND: "Admin panel",
  BACKGROUND_JOB: "Background job",
};

// One problem: every loaded error with the same message from the same place.
export interface ErrorGroup {
  key: string;
  message: string;
  source: ErrorSource;
  // The most severe of the group.
  severity: Severity;
  // Newest first.
  logs: IErrorLog[];
  firstAt: string;
  lastAt: string;
}

const SEVERITY_RANK: Record<Severity, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

// Groups a page of errors (newest first) by message and source, the problem
// seen most recently first. The API lists single errors, so the grouping
// covers what the page loaded.
export const groupErrors = (logs: IErrorLog[]): ErrorGroup[] => {
  const groups = new Map<string, ErrorGroup>();
  for (const log of logs) {
    const key = `${log.source}:${log.message}`;
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { key, message: log.message, source: log.source, severity: log.severity, logs: [log], firstAt: log.createdAt, lastAt: log.createdAt });
      continue;
    }
    group.logs.push(log);
    group.firstAt = log.createdAt;
    if (SEVERITY_RANK[log.severity] > SEVERITY_RANK[group.severity]) group.severity = log.severity;
  }
  return [...groups.values()];
};

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// Ids in a path become "…" (or keep their first few characters), so the
// same request reads the same whichever record it was for.
export const shortenIds = (path: string, keep = 0) => path.replace(UUID, (id) => `${id.slice(0, keep)}…`);

// What the server was answering ("GET /api/businesses/…/transactions"), or
// the page an admin-panel error happened on.
export const errorRequest = (log: IErrorLog, keep = 0): string | null => {
  const meta = log.metadata ?? {};
  const path = typeof meta.path === "string" ? meta.path : typeof meta.url === "string" ? meta.url : null;
  if (!path) return null;
  const method = typeof meta.method === "string" ? `${meta.method} ` : "";
  return `${method}${shortenIds(path, keep)}`;
};

// "5 times · first 8:14 am, last 12:40 pm", or "Once · 3:02 am".
export const errorFrequency = (group: ErrorGroup, now: Date = new Date()): string =>
  group.logs.length === 1
    ? `Once · ${formatLogTime(group.lastAt, { now })}`
    : `${group.logs.length} times · first ${formatLogTime(group.firstAt, { now })}, last ${formatLogTime(group.lastAt, { now })}`;
