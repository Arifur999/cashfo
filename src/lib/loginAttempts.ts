import type { IFailingNetwork, ILoginAccount, ILoginAttempt, ILoginAttemptsSummary } from "@/types/loginAttempt.types";
import { formatDate, formatDayName, formatLogTime } from "./date";
import { humanizeEnum } from "./statusBadge";
import { upperFirst } from "./text";

// One row of the sign-ins list: a single attempt, or back-to-back failures
// by one email from one network ("Wrong password ×5, then paused ×4").
export interface LoginAttemptGroup {
  id: string;
  email: string;
  ipAddress: string;
  deviceLabel: string;
  account: ILoginAccount | null;
  success: boolean;
  // Newest first, as the API sends them.
  attempts: ILoginAttempt[];
  firstAt: string;
  lastAt: string;
  // When the email signed in after the newest failure.
  signedInAt: string | null;
}

const sameSource = (group: LoginAttemptGroup, attempt: ILoginAttempt) =>
  group.ipAddress === attempt.ipAddress && group.email.toLowerCase() === attempt.email.toLowerCase();

// Folds a page of attempts (newest first) into rows. A successful sign-in is
// always its own row.
export const groupLoginAttempts = (attempts: ILoginAttempt[]): LoginAttemptGroup[] => {
  const groups: LoginAttemptGroup[] = [];
  for (const attempt of attempts) {
    const last = groups.at(-1);
    if (last && !last.success && !attempt.success && sameSource(last, attempt)) {
      last.attempts.push(attempt);
      last.firstAt = attempt.createdAt;
      continue;
    }
    groups.push({
      id: attempt.id,
      email: attempt.email,
      ipAddress: attempt.ipAddress,
      deviceLabel: attempt.deviceLabel,
      account: attempt.account,
      success: attempt.success,
      attempts: [attempt],
      firstAt: attempt.createdAt,
      lastAt: attempt.createdAt,
      signedInAt: attempt.signedInAt,
    });
  }
  return groups;
};

const REASON_LABEL: Record<string, string> = {
  invalid_password: "Wrong password",
  account_not_found: "No such account",
  account_suspended: "Account suspended",
  rate_limited: "Paused",
};

export const failureReasonLabel = (reason: string | null) => (reason ? (REASON_LABEL[reason] ?? humanizeEnum(reason.toUpperCase())) : "Failed");

const isAdminAccount = (account: ILoginAccount) => account.role !== "USER";

export interface AttemptOutcome {
  text: string;
  note: string | null;
  tone: "income" | "expense" | "warning";
}

// "Why it failed": the first reason with how many times ("Wrong password
// ×5"), then what followed and what is worth knowing ("then paused ×4 ·
// no account with this email", "Signed in at 8:02 am").
export const attemptOutcome = (group: LoginAttemptGroup, now: Date = new Date()): AttemptOutcome => {
  if (group.success) {
    return { text: "Signed in", note: null, tone: "income" };
  }

  const runs: Array<{ reason: string | null; count: number }> = [];
  for (const attempt of [...group.attempts].reverse()) {
    const last = runs.at(-1);
    if (last && last.reason === attempt.failureReason) last.count += 1;
    else runs.push({ reason: attempt.failureReason, count: 1 });
  }
  const times = (count: number) => (count > 1 ? ` ×${count}` : "");
  const [first, ...rest] = runs;

  const notes = rest.map((run) => `then ${failureReasonLabel(run.reason).toLowerCase()}${times(run.count)}`);
  const { account } = group;
  if (!account && first.reason !== "account_not_found") notes.push("no account with this email");
  if (account && isAdminAccount(account)) notes.push(account.status === "SUSPENDED" ? "admin account, suspended" : "admin account");
  if (group.signedInAt) {
    const gap = new Date(group.signedInAt).getTime() - new Date(group.lastAt).getTime();
    notes.push(gap <= 2 * 60_000 ? "signed in a minute later" : `signed in at ${formatLogTime(group.signedInAt, { now })}`);
  }

  const note = notes.join(" · ");
  return {
    text: `${failureReasonLabel(first.reason)}${times(first.count)}`,
    // "then …" carries on from the line above, so it stays lowercase.
    note: note ? (note.startsWith("then ") ? note : upperFirst(note)) : null,
    tone: first.reason === "account_suspended" ? "warning" : "expense",
  };
};

// "Most failed sign-ins": what to say under each network, and its colour.
export const networkNote = (network: IFailingNetwork, now: Date = new Date()): string => {
  const day = formatDayName(network.lastAt, { now });
  if (network.flagStatus === "RESOLVED") return `${day} · flag resolved`;
  if (network.flagStatus === "FALSE_POSITIVE") return `${day} · flag was a false alarm`;
  const { account } = network;
  if (account && isAdminAccount(account)) return `${account.name}, ${account.status === "SUSPENDED" ? "suspended admin" : "admin"}`;
  if (account) return "App user";
  const [tried] = network.emails;
  if (!tried) return day;
  return `${day} · tried ${tried}${network.emailCount > 1 ? ` and ${network.emailCount - 1} more` : ""}`;
};

export const networkTone = (network: IFailingNetwork): "danger" | "warning" | "neutral" => {
  if (network.flagStatus === "OPEN" || network.flagStatus === "REVIEWING") return "danger";
  if (network.flagStatus) return "warning";
  return "neutral";
};

// Under "Failed sign-ins, 24 hours": how concentrated they were.
export const busiestNetworkNote = (summary: Pick<ILoginAttemptsSummary, "failedLast24h" | "busiestNetworkToday">): string => {
  const { failedLast24h, busiestNetworkToday } = summary;
  if (failedLast24h === 0) return "None in the last day";
  if (!busiestNetworkToday || busiestNetworkToday.count < 2) return "Each from a different network";
  if (busiestNetworkToday.count === failedLast24h) return "All of them from one network";
  return `${busiestNetworkToday.count} of them from one network`;
};

// Under "Paused right now": who, and when sign-in opens again.
export const pausedNote = (summary: Pick<ILoginAttemptsSummary, "paused">): string => {
  const [first, ...others] = summary.paused;
  if (!first) return "Nobody is paused";
  return `${first.email}${others.length > 0 ? ` and ${others.length} more` : ""} · opens again at ${formatDate(first.until, "h:mm aaa")}`;
};
