import type { FlagStatus, ISecurityFlag, Severity, SuspiciousActivityType } from "@/types/securityFlag.types";
import { formatDayName, formatLogTime, type RelativeDateOptions } from "./date";
import { formatCount } from "./i18n/digits";
import { inEnglish, type Translate } from "./i18n/message";

// The design's names for each kind of flag.
export const FLAG_TYPE_LABEL: Record<SuspiciousActivityType, string> = {
  MULTIPLE_FAILED_LOGINS: "Many failed sign-ins",
  UNUSUAL_LOGIN_LOCATION: "Sign-in from a new place",
  MASS_DATA_ACCESS: "Lots of data opened",
  IMPERSONATION_SPIKE: "Many visits as a customer",
  OTHER: "Something else",
};

export const FLAG_STATUS_LABEL: Record<FlagStatus, string> = {
  OPEN: "Open",
  REVIEWING: "Being reviewed",
  RESOLVED: "Resolved",
  FALSE_POSITIVE: "False alarm",
};

export const FLAG_STATUS_CHIP: Record<FlagStatus, string> = {
  OPEN: "bg-expense-soft text-expense",
  REVIEWING: "bg-warning-soft text-warning",
  RESOLVED: "bg-mint-50 text-brand-ink",
  FALSE_POSITIVE: "bg-surface-sunken text-ink-2",
};

// A severity's chip, its icon tile and the stripe down an open card's edge.
export const SEVERITY_META: Record<Severity, { chip: string; tile: string; stripe: string }> = {
  CRITICAL: { chip: "bg-expense text-white", tile: "bg-expense-soft text-expense", stripe: "border-l-expense" },
  HIGH: { chip: "bg-expense-soft text-expense", tile: "bg-expense-soft text-expense", stripe: "border-l-expense-fill" },
  MEDIUM: { chip: "bg-warning-soft text-warning", tile: "bg-warning-soft text-warning", stripe: "border-l-warning-fill" },
  LOW: { chip: "bg-surface-sunken text-ink-2", tile: "bg-surface-sunken text-ink-2", stripe: "border-l-ink-muted" },
};

// Open or being reviewed: it still needs someone.
export const isOpenFlag = (flag: Pick<ISecurityFlag, "status">) => flag.status === "OPEN" || flag.status === "REVIEWING";

// The dark button on an open card. Failed sign-ins carry their evidence, so
// they can be closed straight away; anything else is looked into first.
export const flagNextStep = (flag: Pick<ISecurityFlag, "status" | "type">): { label: string; status: FlagStatus } | null => {
  if (flag.status === "REVIEWING") return { label: "Mark resolved", status: "RESOLVED" };
  if (flag.status !== "OPEN") return null;
  return flag.type === "MULTIPLE_FAILED_LOGINS" ? { label: "Mark resolved", status: "RESOLVED" } : { label: "Start a review", status: "REVIEWING" };
};

const DAY_MS = 86_400_000;
// A failed-sign-ins flag counts the tries of the 15 minutes before it.
const FLAG_LOOKBACK_MS = 15 * 60_000;

// Sign-ins' "When" that still holds a flag's tries: the last 7 or 30 days,
// or any time. Sign-ins opens on the last 24 hours, while a flag stays open
// until someone looks, often for days. A flag without a readable time gets
// any time.
const triesWindow = (createdAt: string | undefined, now: Date): "7d" | "30d" | "all" => {
  const since = createdAt ? now.getTime() - new Date(createdAt).getTime() + FLAG_LOOKBACK_MS : Number.NaN;
  if (!Number.isFinite(since)) return "all";
  return since <= 7 * DAY_MS ? "7d" : since <= 30 * DAY_MS ? "30d" : "all";
};

// "See the 9 tries": the network's failed sign-ins, while the flag is open,
// over a window that reaches back to them. The count comes in the reader's
// digits when `locale` is given.
export const flagTriesLink = (
  flag: Pick<ISecurityFlag, "status" | "type" | "relatedIp" | "description"> & Partial<Pick<ISecurityFlag, "createdAt">>,
  t: Translate = inEnglish,
  { now = new Date(), locale = "en" }: Pick<RelativeDateOptions, "now" | "locale"> = {},
): { href: string; label: string } | null => {
  if (flag.type !== "MULTIPLE_FAILED_LOGINS" || !flag.relatedIp || !isOpenFlag(flag)) return null;
  const tries = /^(\d+) failed/.exec(flag.description)?.[1];
  const query = new URLSearchParams({ ipAddress: flag.relatedIp, success: "false", within: triesWindow(flag.createdAt, now) });
  return {
    href: `/admin/security/logins?${query.toString()}`,
    label: tries ? t("See the {count} tries", { count: formatCount(Number(tries), locale) }) : t("See the tries"),
  };
};

// The grey line under the text: the network, and who is looking into it.
export const flagDetails = (
  flag: Pick<ISecurityFlag, "status" | "relatedIp" | "reviewer" | "reviewedAt">,
  { now = new Date(), t = inEnglish }: Pick<RelativeDateOptions, "now" | "t"> = {},
): string | null => {
  const parts: string[] = [];
  if (flag.relatedIp) parts.push(t("IP {ip}", { ip: flag.relatedIp }));
  if (flag.status === "REVIEWING" && flag.reviewer) {
    parts.push(t("{name} is looking into it since {time}", { name: flag.reviewer.name, time: formatLogTime(flag.reviewedAt, { now, t }) }));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
};

// Who closed a flag, and when: "Nadia Rahman · 28 Sep".
export const flagClosedBy = (flag: Pick<ISecurityFlag, "status" | "reviewer" | "reviewedAt">, options: Pick<RelativeDateOptions, "now" | "t"> = {}): string | null => {
  if (isOpenFlag(flag) || !flag.reviewer) return null;
  return `${flag.reviewer.name} · ${formatDayName(flag.reviewedAt, options)}`;
};
