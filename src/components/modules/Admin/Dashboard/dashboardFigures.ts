// The sums the role dashboards add on top of lib/adminDashboard.ts: the
// support queue's order, which feature requests still count, a bar's short
// amount and when a backup is overdue. Pure, so the cards and their tests
// agree.
import { topRequests } from "@/lib/adminDashboard";
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
// Latin digits and no symbol, like every amount (the card says it is money).
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

// The System page calls a backup worth a look after two days; no backup at
// all is too.
export const BACKUP_DUE_AFTER_DAYS = 2;

export const backupIsDue = (daysSinceLastBackup: number | null): boolean => daysSinceLastBackup === null || daysSinceLastBackup > BACKUP_DUE_AFTER_DAYS;

// Every bar of a chart at zero: nothing has come in yet.
export const allZero = (values: number[]): boolean => values.every((value) => value === 0);
