import type { IFailingNetwork, ILoginAccount, ILoginAttempt, ILoginAttemptsSummary } from "@/types/loginAttempt.types";
import { formatDate, formatDayName, formatLogTime, type RelativeDateOptions } from "./date";
import { inEnglish, type Translate } from "./i18n/message";
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

export const failureReasonLabel = (reason: string | null, t: Translate = inEnglish) =>
  t(reason ? (REASON_LABEL[reason] ?? humanizeEnum(reason.toUpperCase())) : "Failed");

type WordOptions = Pick<RelativeDateOptions, "now" | "t">;

const isAdminAccount = (account: ILoginAccount) => account.role !== "USER";

export interface AttemptOutcome {
  text: string;
  note: string | null;
  tone: "income" | "expense" | "warning";
}

// "Why it failed": the first reason with how many times ("Wrong password
// ×5"), then what followed and what is worth knowing ("then paused ×4 ·
// no account with this email", "Signed in at 8:02 am").
export const attemptOutcome = (group: LoginAttemptGroup, { now = new Date(), t = inEnglish }: WordOptions = {}): AttemptOutcome => {
  if (group.success) {
    return { text: t("Signed in"), note: null, tone: "income" };
  }

  const runs: Array<{ reason: string | null; count: number }> = [];
  for (const attempt of [...group.attempts].reverse()) {
    const last = runs.at(-1);
    if (last && last.reason === attempt.failureReason) last.count += 1;
    else runs.push({ reason: attempt.failureReason, count: 1 });
  }
  const times = (count: number) => (count > 1 ? ` ×${count}` : "");
  const [first, ...rest] = runs;

  const notes = rest.map((run) => t("then {reason}", { reason: failureReasonLabel(run.reason, t).toLowerCase() }) + times(run.count));
  const { account } = group;
  if (!account && first.reason !== "account_not_found") notes.push(t("no account with this email"));
  if (account && isAdminAccount(account)) notes.push(t(account.status === "SUSPENDED" ? "admin account, suspended" : "admin account"));
  if (group.signedInAt) {
    const gap = new Date(group.signedInAt).getTime() - new Date(group.lastAt).getTime();
    notes.push(gap <= 2 * 60_000 ? t("signed in a minute later") : t("signed in at {time}", { time: formatLogTime(group.signedInAt, { now, t }) }));
  }

  const note = notes.join(" · ");
  return {
    text: failureReasonLabel(first.reason, t) + times(first.count),
    // "then …" carries on from the line above, so it stays lowercase.
    note: note ? (rest.length > 0 ? note : upperFirst(note)) : null,
    tone: first.reason === "account_suspended" ? "warning" : "expense",
  };
};

// "Most failed sign-ins": what to say under each network, and its colour.
export const networkNote = (network: IFailingNetwork, { now = new Date(), t = inEnglish }: WordOptions = {}): string => {
  const day = formatDayName(network.lastAt, { now, t });
  if (network.flagStatus === "RESOLVED") return t("{day} · flag resolved", { day });
  if (network.flagStatus === "FALSE_POSITIVE") return t("{day} · flag was a false alarm", { day });
  const { account } = network;
  if (account && isAdminAccount(account)) return t(account.status === "SUSPENDED" ? "{name}, suspended admin" : "{name}, admin", { name: account.name });
  if (account) return t("App user");
  const [tried] = network.emails;
  if (!tried) return day;
  return network.emailCount > 1
    ? t("{day} · tried {email} and {count} more", { day, email: tried, count: network.emailCount - 1 })
    : t("{day} · tried {email}", { day, email: tried });
};

export const networkTone = (network: IFailingNetwork): "danger" | "warning" | "neutral" => {
  if (network.flagStatus === "OPEN" || network.flagStatus === "REVIEWING") return "danger";
  if (network.flagStatus) return "warning";
  return "neutral";
};

// Under "Failed sign-ins, 24 hours": how concentrated they were.
export const busiestNetworkNote = (summary: Pick<ILoginAttemptsSummary, "failedLast24h" | "busiestNetworkToday">, t: Translate = inEnglish): string => {
  const { failedLast24h, busiestNetworkToday } = summary;
  if (failedLast24h === 0) return t("None in the last day");
  if (!busiestNetworkToday || busiestNetworkToday.count < 2) return t("Each from a different network");
  if (busiestNetworkToday.count === failedLast24h) return t("All of them from one network");
  return t("{count} of them from one network", { count: busiestNetworkToday.count });
};

// Under "Paused right now": who, and when sign-in opens again.
export const pausedNote = (summary: Pick<ILoginAttemptsSummary, "paused">, t: Translate = inEnglish): string => {
  const [first, ...others] = summary.paused;
  if (!first) return t("Nobody is paused");
  const time = formatDate(first.until, "h:mm aaa");
  return others.length > 0
    ? t("{email} and {count} more · opens again at {time}", { email: first.email, count: others.length, time })
    : t("{email} · opens again at {time}", { email: first.email, time });
};
