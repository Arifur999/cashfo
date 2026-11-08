import { formatDay } from "@/lib/date";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import type { Translate } from "@/lib/i18n/message";
import type { GroupActivity, GroupMember } from "./api";
import { formatCurrency } from "./currency";
import { monthName } from "./insights";

// The Activity log's lines, written in the reader's language from what the
// backend stored about each change (who, what, from what to what).

export interface ActivityLine {
  // "added an expense"
  verb: string;
  // "Bazar & grocery · ৳ 3,200"
  what: string;
  // Each change: "Amount: ৳ 3,200 → ৳ 3,600".
  changes: { label: string; from: string; to: string }[];
  // "Fish & vegetables · 24 Oct 2026"
  meta: string;
}

const text = (value: unknown): string => (value === null || value === undefined ? "" : String(value));
const isDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const FIELD_LABELS: Record<string, string> = {
  amount: "Amount",
  date: "Date",
  category: "Category",
  description: "Description",
  paidBy: "Paid by",
  paidFrom: "Paid from",
  member: "Member",
  receivedBy: "Given to",
  // A cash handover's two holders.
  from: "From",
  to: "To",
  note: "Note",
  name: "Name",
  phone: "Phone",
  role: "Role",
  status: "Status",
  household: "Whose share it covers",
  joinedOn: "Joins on",
  icon: "Icon",
  color: "Color",
  defaultSplit: "How it is shared",
  hidden: "Shown",
  kind: "Kind of group",
  monthStartDay: "Month starts on",
  cashHolderMemberId: "Cash kept by",
  mealsOn: "Meal counting",
  budgetWarnPercent: "Budget warning",
  paused: "Paused",
  mode: "Cost split",
};

const VALUE_WORDS: Record<string, Record<string, string>> = {
  paidFrom: { FUND: "Accountant's cash", MEMBER: "Own pocket" },
  role: { MEMBER: "No access", ACCOUNTANT: "Editor", VIEWER: "Viewer" },
  status: { ACTIVE: "Active", ARCHIVED: "Inactive" },
  defaultSplit: { EQUAL: "Equally", SHARES: "By cost split", MEALS: "By meals", EXACT: "Exact amounts" },
  hidden: { true: "Hidden", false: "Shown" },
  kind: { FAMILY: "Family", MESS: "Mess" },
  mealsOn: { true: "On", false: "Off" },
  paused: { true: "Paused", false: "Running" },
  mode: { EQUAL: "Equal", CUSTOM: "Custom %" },
};

// What each access event says ("made an access link for Rakib").
const ACCESS_VERBS: Record<string, string> = {
  LINK: "made an access link for",
  RESET_LINK: "made a password reset link for",
  LINK_CANCELLED: "cancelled the access link of",
  JOINED: "joined with their access link as",
  RESET: "set a new password from the reset link as",
  ATTACHED: "added the group to their account as",
};

export function activityLine(entry: GroupActivity, members: GroupMember[], currency: string, t: Translate, fmt: FormatLocale): ActivityLine {
  const s = entry.summary ?? {};
  const money = (value: unknown) => (text(value) ? formatCurrency(text(value), currency, fmt) : "");
  const day = (value: unknown) => (isDay(text(value)) ? formatDay(text(value), "d MMM yyyy", fmt) : text(value));
  const nameOf = (id: unknown) => members.find((member) => member.id === id)?.name ?? text(id);
  const value = (field: string, raw: unknown): string => {
    if (raw === null || raw === undefined || raw === "") return "—";
    const words = VALUE_WORDS[field]?.[String(raw)];
    if (words) return t(words);
    if (field === "amount") return money(raw);
    if (field === "cashHolderMemberId") return nameOf(raw);
    if (field === "budgetWarnPercent") return `${text(raw)}%`;
    if (entry.entity === "SPLIT" && typeof raw === "number") return `${raw}%`;
    return day(raw);
  };
  const changes = (entry.change ?? []).map((change) => ({
    label: entry.entity === "SPLIT" && !FIELD_LABELS[change.field] ? change.field : t(FIELD_LABELS[change.field] ?? change.field),
    from: value(change.field, change.from),
    to: value(change.field, change.to),
  }));
  const join = (...parts: string[]) => parts.filter(Boolean).join(" · ");
  const contributionVerb = (kind: unknown) => (kind === "RETURN" ? "a return to" : kind === "SETTLE" ? "a settle-up of" : kind === "CARRY" ? "a carried balance of" : "a deposit from");

  switch (entry.entity) {
    case "EXPENSE":
      return {
        verb: t(entry.action === "ADDED" ? "added an expense" : entry.action === "DELETED" ? "deleted an expense" : "changed an expense"),
        what: join(text(s.category), money(s.amount)),
        changes,
        meta: join(text(s.description), day(s.date), s.paidFrom === "MEMBER" && s.paidBy ? t("{name}'s pocket", { name: text(s.paidBy) }) : text(s.paidBy)),
      };
    case "CONTRIBUTION": {
      const kind = t(contributionVerb(s.kind));
      return {
        verb: entry.action === "ADDED" ? t("recorded {kind}", { kind }) : entry.action === "DELETED" ? t("deleted {kind}", { kind }) : t("changed {kind}", { kind }),
        what: join(text(s.member), money(s.amount)),
        changes,
        meta: join(s.receivedBy ? t("Received by {name}", { name: text(s.receivedBy) }) : "", text(s.note), day(s.date)),
      };
    }
    case "SETTLE":
      return {
        verb: t(entry.action === "DELETED" ? "undid a payment" : "recorded a payment"),
        what: join(`${text(s.from)} → ${text(s.to)}`, money(s.amount)),
        changes,
        meta: day(s.date),
      };
    case "HANDOVER":
      return {
        verb: t(entry.action === "ADDED" ? "handed over cash" : entry.action === "DELETED" ? "deleted a cash handover" : "changed a cash handover"),
        what: join(`${text(s.from)} → ${text(s.to)}`, money(s.amount)),
        changes,
        meta: join(text(s.note), day(s.date)),
      };
    // A member's access: a link made, cancelled or used, a new password.
    case "ACCESS":
      return {
        verb: t(ACCESS_VERBS[text(s.event)] ?? "changed the access of"),
        what: text(s.member),
        changes,
        meta: join(s.role ? value("role", s.role) : "", s.username ? t("username {name}", { name: text(s.username) }) : ""),
      };
    case "MEMBER":
      return {
        verb: t(entry.action === "ADDED" ? "added a member" : entry.action === "DELETED" ? "removed a member" : "changed a member"),
        what: text(s.member),
        changes,
        meta: s.role ? value("role", s.role) : "",
      };
    case "CATEGORY":
      return {
        verb: t(entry.action === "ADDED" ? (Array.isArray(s.names) ? "set up the categories" : "added a category") : entry.action === "DELETED" ? "deleted a category" : "changed a category"),
        what: Array.isArray(s.names) ? s.names.map(text).join(", ") : text(s.category),
        changes,
        meta: "",
      };
    case "BUDGET": {
      const month = s.year && s.month ? monthName(`${text(s.year)}-${text(s.month).padStart(2, "0")}`, fmt, "long", true) : "";
      return {
        verb: t(entry.action === "ADDED" ? "set the budget for" : entry.action === "DELETED" ? "removed the budget for" : "changed the budget for"),
        what: join(month, money(s.amount)),
        changes,
        meta: "",
      };
    }
    case "SPLIT":
      return { verb: t("changed the cost split"), what: s.mode ? value("mode", s.mode) : "", changes, meta: "" };
    case "SETTINGS":
      return { verb: t("changed the settings"), what: "", changes, meta: "" };
    case "MEALS":
      return { verb: t("updated the meals for"), what: day(s.date), changes, meta: "" };
    case "MONTH": {
      const month = text(s.periodStart) ? monthName(text(s.periodStart).slice(0, 7), fmt, "long", true) : "";
      const open = Number(s.open ?? 0);
      if (s.reopened) return { verb: t("reopened"), what: month, changes, meta: Number(s.carriedRemoved ?? 0) > 0 ? t("the balances it carried were taken back") : "" };
      return {
        verb: t("closed"),
        what: month,
        changes,
        meta: join(
          t("{count} settled", { count: text(s.settled ?? 0) }),
          s.carriedForward ? (open > 0 ? t("{count} balances moved to the next month", { count: String(open) }) : t("balances moved to the next month")) : "",
          s.nextBudget ? t("next month's budget {amount}", { amount: money(s.nextBudget) }) : "",
        ),
      };
    }
    default:
      return { verb: t(entry.action === "ADDED" ? "added" : entry.action === "DELETED" ? "deleted" : "changed"), what: entry.entity, changes, meta: "" };
  }
}
