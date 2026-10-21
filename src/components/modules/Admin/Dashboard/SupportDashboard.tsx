"use client";

import { ChevronUp } from "lucide-react";
import Chip from "@/components/smartly/Chip";
import { ListCell, ListEmpty, ListHead, ListHeadCell, ListRow, ListRowLink } from "@/components/smartly/list";
import { formatElapsed } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { hoursText, isLate, shortTicketId } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import type { FeatureRequestStatus, IFeatureRequest } from "@/types/featureRequest.types";
import type { ISupportTicket, ITicketStats, TicketPriority, TicketStatus } from "@/types/ticket.types";
import { openRequests, waitingSince } from "./dashboardFigures";
import { COULD_NOT_LOAD, Greeting, Kpi, LoadFailed, SECTION_ROW, Section, SectionLink, SectionTable, Unavailable } from "./pieces";

// Every null below is a call that failed: the card says so rather than
// showing an empty or all-clear state.
export interface SupportDashboardData {
  stats: ITicketStats | null;
  // The tickets that need a reply, the most urgent and longest waiting
  // first, and how many need one in all.
  queue: { tickets: ISupportTicket[]; total: number } | null;
  requests: IFeatureRequest[] | null;
  // The server's clock when it read the queue, so the waits the server
  // prints and the ones the browser hydrates are the same text.
  now: number;
}

interface SupportDashboardProps extends SupportDashboardData {
  adminName: string;
  hour: number;
}

// English, passed through translate(): the board's plain names.
const PRIORITY: Record<TicketPriority, { label: string; tone: "neutral" | "info" | "warning" | "expense" }> = { LOW: { label: "Low", tone: "neutral" }, MEDIUM: { label: "Medium", tone: "info" }, HIGH: { label: "High", tone: "warning" }, URGENT: { label: "Urgent", tone: "expense" } };
const STATUS: Record<TicketStatus, string> = { OPEN: "Need a reply", IN_PROGRESS: "In progress", WAITING_ON_USER: "Waiting on the user", RESOLVED: "Resolved", CLOSED: "Closed" };
const REQUEST_STATUS: Record<FeatureRequestStatus, { label: string; tone: "neutral" | "info" | "warning" | "income" }> = { SUBMITTED: { label: "New", tone: "neutral" }, UNDER_REVIEW: { label: "Looking at it", tone: "info" }, PLANNED: { label: "Planned", tone: "warning" }, IN_PROGRESS: { label: "Being built", tone: "warning" }, SHIPPED: { label: "Shipped", tone: "income" }, DECLINED: { label: "Not planned", tone: "neutral" } };

// From md up the queue is a table; on a phone each ticket is two lines: the
// subject over its number, status and user, with the priority and the wait
// on the right.
// Slim fixed columns, so the subject keeps room beside the side column.
const COLUMNS = "md:grid-cols-[64px_minmax(0,1fr)_128px_84px_72px]";

// The support admin's dashboard: the tickets that need a reply first.
export function SupportDashboard({ adminName, hour, stats, queue, requests, now }: SupportDashboardProps) {
  const { translate, locale } = useLocale();
  const at = new Date(now);
  const count = (value: number) => formatCount(value, locale);
  const title = translate("Waiting for a reply");
  const top = requests ? openRequests(requests) : [];

  return (
    <div className="flex flex-col gap-4">
      <Greeting name={adminName} hour={hour} line={translate("Support admin · your tickets first. Pages with a lock are view only for your role.")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Need a reply" value={stats ? count(stats.openCount) : "—"} note={stats ? translate("{count} with no one assigned", { count: count(stats.unassignedOpenCount) }) : COULD_NOT_LOAD} />
        <Kpi label="In progress" value={stats ? count(stats.inProgressCount) : "—"} note={stats ? undefined : COULD_NOT_LOAD} />
        {/* Urgent counts every ticket not solved yet, whatever its step. */}
        <Kpi label="Urgent" value={stats ? count(stats.urgentCount) : "—"} note={stats ? "Anywhere in the queue" : COULD_NOT_LOAD} />
        <Kpi
          label="Avg. time to resolve"
          value={stats ? hoursText(stats.avgResolutionHours, translate, locale) : "—"}
          note={stats ? translate("{count} solved this week", { count: count(stats.solvedThisWeekCount) }) : COULD_NOT_LOAD}
        />
      </div>

      {/* Side by side only from xl: beside the 340px column at lg the queue is too narrow for its table. */}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Section
          title={title}
          flush
          aside={
            <span className="flex flex-wrap items-center gap-x-3">
              {queue && queue.total > queue.tickets.length && <span>{translate("{shown} of {total} waiting", { shown: count(queue.tickets.length), total: count(queue.total) })}</span>}
              {/* The inbox's "Need a reply" tab: the same tickets the count beside it counts. */}
              <SectionLink href="/admin/support?status=OPEN">{translate("Open inbox")}</SectionLink>
            </span>
          }
        >
          <SectionTable label={title}>
            <ListHead columns={COLUMNS} className={cn(SECTION_ROW, "border-t")}>
              <ListHeadCell>{translate("Ticket")}</ListHeadCell>
              <ListHeadCell>{translate("Subject")}</ListHeadCell>
              <ListHeadCell>{translate("User")}</ListHeadCell>
              <ListHeadCell>{translate("Priority")}</ListHeadCell>
              <ListHeadCell align="end">{translate("Waiting")}</ListHeadCell>
            </ListHead>
            {queue === null ? (
              <ListEmpty title={translate("Couldn't load this. Refresh to try again.")} className="text-small" />
            ) : queue.tickets.length === 0 ? (
              <ListEmpty title={translate("Nothing is waiting. Enjoy the quiet.")} className="text-small" />
            ) : (
              queue.tickets.map((ticket) => {
                const user = ticket.platformUser?.name ?? "—";
                return (
                  <ListRow key={ticket.id} columns={COLUMNS} className={SECTION_ROW}>
                    <ListCell className="hidden font-mono text-small font-semibold text-ink-2 md:block">{shortTicketId(ticket.id)}</ListCell>
                    <ListCell className="max-md:row-span-2">
                      <ListRowLink href={`/admin/support/${ticket.id}`} className="block truncate font-semibold text-ink">
                        {ticket.subject}
                      </ListRowLink>
                      <span className="block truncate text-caption text-ink-muted">
                        <span className="md:hidden">{shortTicketId(ticket.id)} · </span>
                        {translate(STATUS[ticket.status])}
                        <span className="md:hidden"> · {user}</span>
                      </span>
                    </ListCell>
                    <ListCell className="hidden truncate text-ink-2 md:block">{user}</ListCell>
                    <ListCell className="max-md:text-right">
                      <Chip tone={PRIORITY[ticket.priority].tone} size="sm">
                        {translate(PRIORITY[ticket.priority].label)}
                      </Chip>
                    </ListCell>
                    {/* Counted like the inbox: from the last message, late after a day of the user waiting. */}
                    <ListCell align="end" className={cn("text-small max-md:col-start-2", isLate(ticket, at) ? "font-semibold text-expense" : "text-ink-2")}>
                      {formatElapsed(waitingSince(ticket), { t: translate, locale, now: at })}
                    </ListCell>
                  </ListRow>
                );
              })
            )}
          </SectionTable>
        </Section>

        <Section title={translate("Most asked for")} aside={<SectionLink href="/admin/feature-requests">{translate("Feature requests")}</SectionLink>} flush={top.length > 0}>
          {requests === null ? (
            <LoadFailed />
          ) : requests.length === 0 ? (
            <Unavailable>{translate("No requests yet.")}</Unavailable>
          ) : top.length === 0 ? (
            <Unavailable>{translate("No open requests.")}</Unavailable>
          ) : (
            <SectionTable label={translate("Most asked for")}>
              {top.map((request) => (
                <ListRow key={request.id} density="dense" className={cn(SECTION_ROW, "grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 py-2")}>
                  <ListCell>
                    <span className="flex h-7.5 min-w-11 items-center justify-center gap-0.5 rounded-md bg-surface-sunken px-2 font-bold text-ink tabular-nums">
                      <ChevronUp className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                      {count(request.voteCount)}
                    </span>
                  </ListCell>
                  <ListCell>
                    <ListRowLink href="/admin/feature-requests" className="block text-ink">
                      {request.title}
                    </ListRowLink>
                  </ListCell>
                  <ListCell align="end">
                    <Chip tone={REQUEST_STATUS[request.status].tone} size="sm">
                      {translate(REQUEST_STATUS[request.status].label)}
                    </Chip>
                  </ListCell>
                </ListRow>
              ))}
            </SectionTable>
          )}
        </Section>
      </div>
    </div>
  );
}
