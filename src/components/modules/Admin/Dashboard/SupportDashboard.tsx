"use client";

import { ChevronUp } from "lucide-react";
import Link from "next/link";
import Chip from "@/components/smartly/Chip";
import { formatElapsed } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural, type Translate } from "@/lib/i18n/message";
import { shortTicketId } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import type { IDashboardSupport } from "@/types/dashboard.types";
import { Greeting, LoadFailed, Section, SectionLink, Unavailable } from "./pieces";

interface SupportDashboardProps {
  adminName: string;
  hour: number;
  // null when the summary couldn't be loaded.
  support: IDashboardSupport | null;
  // The server's clock, so the waits the server prints and the ones the
  // browser hydrates are the same text.
  now: number;
}

// English, passed through translate(): the board's plain names and colours.
const PRIORITY: Record<string, { label: string; tone: "neutral" | "expense" }> = {
  LOW: { label: "Low", tone: "neutral" },
  MEDIUM: { label: "Medium", tone: "neutral" },
  HIGH: { label: "High", tone: "expense" },
  URGENT: { label: "Urgent", tone: "expense" },
};
const IDEA_STATUS: Record<string, { label: string; tone: "neutral" | "info" | "warning" | "habits" | "income" }> = {
  SUBMITTED: { label: "New", tone: "neutral" },
  UNDER_REVIEW: { label: "Looking at it", tone: "info" },
  PLANNED: { label: "Planned", tone: "habits" },
  IN_PROGRESS: { label: "Being built", tone: "warning" },
  SHIPPED: { label: "Shipped", tone: "income" },
  DECLINED: { label: "Not planned", tone: "neutral" },
};

// The queue's columns from md up; a phone stacks each ticket in two lines.
const COLUMNS = "md:grid-cols-[64px_minmax(0,1fr)_160px_86px_110px]";

// What a support admin may do, as the board lists it (the roles grid has
// the full table).
const CAN_DO = ["Answer, assign and close tickets", "Suspend or turn users back on", "Send campaigns to users", "Look at every other page, without changing it"];

// "3h 20m", "45m", "2 days": the average wait for a first answer.
function replyTime(minutes: number, t: Translate, count: (value: number) => string): string {
  if (minutes < 60) return t("{m}m", { m: count(minutes) });
  const hours = Math.floor(minutes / 60);
  if (hours >= 48) return t("{count} days", { count: count(Math.round(hours / 24)) });
  const rest = minutes % 60;
  return rest > 0 ? t("{h}h {m}m", { h: count(hours), m: count(rest) }) : t("{h}h", { h: count(hours) });
}

// The support admin's dashboard as the AdminDashboardSupport board draws
// it: the team's ticket counts, this admin's own queue (waiting on us
// first, longest wait first), the most-voted ideas and what the role can do.
export function SupportDashboard({ adminName, hour, support, now }: SupportDashboardProps) {
  const { translate, locale } = useLocale();
  const at = new Date(now);
  const count = (value: number) => formatCount(value, locale);

  const kpis = support
    ? [
        { label: "Open tickets", value: support.openTickets, sub: plural(translate, support.noReply, "{count} has no reply yet", "{count} have no reply yet", undefined, locale), tone: "text-ink-muted" },
        {
          label: "Assigned to you",
          value: support.assignedToYou,
          sub: translate("{count} past the 24-hour goal", { count: count(support.assignedToYouPastGoal) }),
          tone: support.assignedToYouPastGoal > 0 ? "text-warning" : "text-ink-muted",
        },
        { label: "Waiting on the user", value: support.waitingOnUser, sub: translate("Close after 7 quiet days"), tone: "text-ink-muted" },
        {
          label: "Solved this week",
          value: support.solvedThisWeek,
          sub: support.avgFirstReplyMinutes === null ? translate("No first replies yet") : translate("First reply in {time} on average", { time: replyTime(support.avgFirstReplyMinutes, translate, count) }),
          tone: "text-emerald",
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4.5">
      <Greeting name={adminName} hour={hour} line={translate("Support admin · your tickets first. Pages with a lock are view only for your role.")} withDate={false} />

      {support === null ? (
        <Section title={translate("Your queue")}>
          <LoadFailed />
        </Section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="flex flex-col gap-1.5 rounded-card border border-line-card bg-surface px-4.5 py-4 shadow-card">
                <span className="text-small text-ink-muted">{translate(kpi.label)}</span>
                <span className="text-[26px] leading-[normal] font-bold text-ink tabular-nums">{count(kpi.value)}</span>
                <span className={cn("text-[12.5px] leading-[normal]", kpi.tone)}>{kpi.sub}</span>
              </div>
            ))}
          </div>

          <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section aria-labelledby="queue-title" className="overflow-clip rounded-card border border-line-card bg-surface shadow-card">
              <div className="flex items-center justify-between gap-3 px-4.5 py-3.5">
                <h2 id="queue-title" className="text-title text-ink">
                  {translate("Your queue")}
                </h2>
                <SectionLink href="/admin/support">{translate("All tickets")}</SectionLink>
              </div>
              <div role="table" aria-labelledby="queue-title">
                <div role="row" className={cn("hidden items-center gap-x-3 border-y border-line bg-table-head px-4.5 py-2 text-caption font-medium text-ink-muted md:grid", COLUMNS)}>
                  <span role="columnheader">{translate("Ticket")}</span>
                  <span role="columnheader">{translate("Subject")}</span>
                  <span role="columnheader">{translate("User")}</span>
                  <span role="columnheader">{translate("Priority")}</span>
                  <span role="columnheader" className="text-right">
                    {translate("Waiting")}
                  </span>
                </div>
                {support.queue.length === 0 ? (
                  <p className="border-t border-line px-4.5 py-8 text-center text-small text-ink-muted md:border-t-0">{translate("Nothing assigned to you is open. Enjoy the quiet.")}</p>
                ) : (
                  support.queue.map((ticket) => {
                    const waitingForUs = ticket.waitingSince !== null;
                    const priority = PRIORITY[ticket.priority] ?? PRIORITY.MEDIUM;
                    const user = ticket.userName ?? "—";
                    return (
                      <Link
                        key={ticket.id}
                        role="row"
                        href={`/admin/support/${ticket.id}`}
                        className={cn("grid min-h-14.5 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-divider px-4.5 py-2 text-[13.5px] leading-[normal] text-ink transition-colors last:border-b-0 hover:bg-hover", COLUMNS)}
                      >
                        <span role="cell" className="hidden font-mono text-[12.5px] font-semibold text-ink-2 md:block">
                          {shortTicketId(ticket)}
                        </span>
                        <span role="cell" className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate font-semibold">{ticket.subject}</span>
                          <span className="truncate text-caption text-ink-muted">
                            <span className="md:hidden">{shortTicketId(ticket)} · </span>
                            {translate(waitingForUs ? "Waiting for you" : "Waiting on the user")}
                            <span className="md:hidden"> · {user}</span>
                          </span>
                        </span>
                        <span role="cell" className="hidden truncate text-ink-2 md:block">
                          {user}
                        </span>
                        <span role="cell" className="max-md:hidden">
                          <Chip tone={priority.tone} size="sm" className="h-auto px-2 py-0.5 text-[11.5px]">
                            {translate(priority.label)}
                          </Chip>
                        </span>
                        <span
                          role="cell"
                          className={cn("text-right text-[12.5px]", ticket.pastGoal ? "font-bold text-expense" : waitingForUs ? "font-medium text-ink" : "font-medium text-ink-muted")}
                        >
                          {formatElapsed(ticket.waitingSince ?? ticket.updatedFrom, { t: translate, locale, now: at })}
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </section>

            <div className="flex flex-col gap-3.5">
              <Section title={translate("Most asked for")} aside={<SectionLink href="/admin/feature-requests">{translate("Feature requests")}</SectionLink>} className="gap-2.5">
                {support.topIdeas.length === 0 ? (
                  <Unavailable>{translate("No open requests.")}</Unavailable>
                ) : (
                  support.topIdeas.map((idea) => {
                    const status = IDEA_STATUS[idea.status] ?? IDEA_STATUS.SUBMITTED;
                    return (
                      <Link key={idea.id} href="/admin/feature-requests" className="flex items-center gap-2.5 rounded-sm text-[13.5px] text-ink transition-colors hover:bg-hover">
                        <span className="flex h-7.5 min-w-11 shrink-0 items-center justify-center gap-0.75 rounded-sm bg-surface-sunken px-1.5 font-bold tabular-nums">
                          <ChevronUp className="size-3.25 text-ink-2" strokeWidth={2.5} aria-hidden="true" />
                          {count(idea.voteCount)}
                        </span>
                        <span className="min-w-0 flex-1 leading-[1.35]">{idea.title}</span>
                        <Chip tone={status.tone} size="sm">
                          {translate(status.label)}
                        </Chip>
                      </Link>
                    );
                  })
                )}
              </Section>
              <Section title={translate("What you can do")} className="gap-2">
                <ul className="flex list-disc flex-col gap-1.25 pl-4.5 text-small leading-[1.45] text-ink-2">
                  {CAN_DO.map((line) => (
                    <li key={line}>{translate(line)}</li>
                  ))}
                </ul>
                <span className="text-[12.5px] leading-[normal] text-ink-muted">{translate("Need more? Ask a super admin to change your role.")}</span>
              </Section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
