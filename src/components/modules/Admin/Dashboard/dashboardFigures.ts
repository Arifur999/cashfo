// The sums the role dashboards add on top of lib/adminDashboard.ts: the
// support queue's order, which feature requests still count, a bar's short
// amount and when a backup is overdue. Pure, so the cards and their tests
// agree.
import { topRequests } from "@/lib/adminDashboard";
import { takaSign } from "@/lib/i18n/formatPrefs";
import type { Locale } from "@/lib/i18n/translate";
import type { FeatureRequestStatus } from "@/types/featureRequest.types";
import type { TicketPriority } from "@/types/ticket.types";

const PRIORITY_RANK: Record<TicketPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

interface QueueTicket {
  priority: TicketPriority;
  lastMessageAt: string | null;
  createdAt: string;
}

// How long a ticket has waited is counted from its last message, or from
// when it was opened if nobody has written yet: the inbox counts it so.
export const waitingSince = (ticket: Pick<QueueTicket, "lastMessageAt" | "createdAt">): string => ticket.lastMessageAt ?? ticket.createdAt;

// The queue as it should be answered: the most urgent first, then whoever
// has waited longest. The API sorts unassigned and newest first instead.
export const queueOrder = <T extends QueueTicket>(tickets: T[]): T[] =>
  [...tickets].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || Date.parse(waitingSince(a)) - Date.parse(waitingSince(b)));

// A request that shipped or was turned down is no longer being asked for.
const SETTLED: FeatureRequestStatus[] = ["SHIPPED", "DECLINED"];

// The most-voted requests still open, the most votes first.
export const openRequests = <T extends { status: FeatureRequestStatus; voteCount: number }>(list: T[], count = 3): T[] =>
  topRequests(
    list.filter((request) => !SETTLED.includes(request.status)),
    count,
  );

// Each unit and the figure at which the next one takes over: 100k is 1L
// (a lakh), 100L is 1Cr (a crore).
const STEPS = [
  { size: 1, suffix: "", below: 1000 },
  { size: 1_000, suffix: "k", below: 100 },
  { size: 100_000, suffix: "L", below: 100 },
  { size: 10_000_000, suffix: "Cr", below: Infinity },
];

// A bar's amount in a few characters, so six of them fit side by side on a
// phone: 850, 2.9k, 13k, 1.2L, 13L, 1.2Cr. One decimal below 10, whole above.
// Latin digits, like every amount, and no symbol: compactMoney adds the taka
// sign where the bars are money.
export function compactAmount(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  for (const step of STEPS) {
    const scaled = abs / step.size;
    const shown = step.size === 1 || scaled >= 10 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
    if (shown < step.below) return `${sign}${shown}${step.suffix}`;
  }
  return `${sign}${Math.round(abs)}`;
}

// A money bar's figure as the board writes it: "TK4.4k", "TK0", "-TK2.9k"
// ("৳4.4k" in Bangla). No space after the sign, unlike formatAmount, so it
// still fits a phone's slot.
export function compactMoney(value: number, locale: Locale): string {
  const figure = compactAmount(Math.abs(value));
  return `${value < 0 && figure !== "0" ? "-" : ""}${takaSign(locale)}${figure}`;
}

// The System page calls a backup worth a look after two days; no backup at
// all is too.
export const BACKUP_DUE_AFTER_DAYS = 2;

export const backupIsDue = (daysSinceLastBackup: number | null): boolean => daysSinceLastBackup === null || daysSinceLastBackup > BACKUP_DUE_AFTER_DAYS;

// Every bar of a chart at zero: nothing has come in yet.
export const allZero = (values: number[]): boolean => values.every((value) => value === 0);

// A revenue bar's label as the AdminDashboard board writes it: "TK 41.3k",
// "TK 1.2L", "TK 850" ("৳ 41.3k" in Bangla). Latin digits; the card puts
// them in the reader's.
// Over more than six bars the board leaves the taka sign off ("41.3k").
export function revenueBarLabel(value: number, locale: Locale, withSign = true): string {
  const abs = Math.abs(value);
  const sign = `${value < 0 ? "-" : ""}${withSign ? `${takaSign(locale)} ` : ""}`;
  if (abs >= 100_000) return `${sign}${(abs / 100_000).toFixed(1)}L`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${Math.round(abs)}`;
}

// Which bars of a daily chart get a date under them: the first, three
// evenly between, and the last (labelled "Today").
export function axisTicks(count: number, ticks = 5): number[] {
  if (count <= 0) return [];
  if (count <= ticks) return Array.from({ length: count }, (_, index) => index);
  return Array.from({ length: ticks }, (_, index) => Math.round((index * (count - 1)) / (ticks - 1)));
}

// One line of the dashboard's "Download report": a section, what it is and
// its value, with commas and quotes escaped for a spreadsheet.
const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export interface ReportLine {
  section: string;
  item: string;
  value: string | number;
}

export const reportCsv = (lines: ReportLine[]): string => ["Section,Item,Value", ...lines.map((line) => [line.section, line.item, line.value].map(csvCell).join(","))].join("\n");
