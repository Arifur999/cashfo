"use client";

import { ChevronUp } from "lucide-react";
import Link from "next/link";
import Chip from "@/components/smartly/Chip";
import { hoursSince, topRequests } from "@/lib/adminDashboard";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatHours, formatNumber } from "@/lib/number";
import { cn } from "@/lib/utils";
import type { FeatureRequestStatus, IFeatureRequest } from "@/types/featureRequest.types";
import type { ISupportTicket, ITicketStats, TicketPriority, TicketStatus } from "@/types/ticket.types";
import { Greeting, Kpi, Section, SectionLink, Unavailable } from "./pieces";

export interface SupportDashboardData {
  stats: ITicketStats | null;
  // Open tickets, oldest wait first.
  queue: ISupportTicket[];
  requests: IFeatureRequest[];
}

interface SupportDashboardProps extends SupportDashboardData {
  adminName: string;
  hour: number;
}

// English, passed through translate(): the board's plain names.
const PRIORITY: Record<TicketPriority, { label: string; tone: "neutral" | "info" | "warning" | "expense" }> = { LOW: { label: "Low", tone: "neutral" }, MEDIUM: { label: "Medium", tone: "info" }, HIGH: { label: "High", tone: "warning" }, URGENT: { label: "Urgent", tone: "expense" } };
const STATUS: Record<TicketStatus, string> = { OPEN: "Need a reply", IN_PROGRESS: "In progress", WAITING_ON_USER: "Waiting on the user", RESOLVED: "Resolved", CLOSED: "Closed" };
const REQUEST_STATUS: Record<FeatureRequestStatus, { label: string; tone: "neutral" | "info" | "warning" | "income" }> = { SUBMITTED: { label: "New", tone: "neutral" }, UNDER_REVIEW: { label: "Looking at it", tone: "info" }, PLANNED: { label: "Planned", tone: "warning" }, IN_PROGRESS: { label: "Being built", tone: "warning" }, SHIPPED: { label: "Shipped", tone: "income" }, DECLINED: { label: "Not planned", tone: "neutral" } };

const GRID = "md:grid md:grid-cols-[72px_minmax(0,1fr)_160px_90px_90px] md:items-center md:gap-x-3";

// The support admin's dashboard: the tickets that need a reply first.
export function SupportDashboard({ adminName, hour, stats, queue, requests }: SupportDashboardProps) {
  const { translate } = useLocale();
  const now = new Date();
  return (
    <div className="flex flex-col gap-4">
      <Greeting name={adminName} hour={hour} line={translate("Support admin · your tickets first. Pages with a lock are view only for your role.")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={translate("Open tickets")} value={stats ? formatNumber(stats.openCount) : "—"} note={stats ? `${stats.urgentCount} ${translate("urgent")}` : undefined} />
        <Kpi label={translate("In progress")} value={stats ? formatNumber(stats.inProgressCount) : "—"} />
        <Kpi label={translate("Urgent")} value={stats ? formatNumber(stats.urgentCount) : "—"} chip={stats && stats.urgentCount > 0 ? { text: translate("Urgent"), tone: "expense" } : null} />
        <Kpi label={translate("Avg. time to resolve")} value={stats ? formatHours(stats.avgResolutionHours) : "—"} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Section title={translate("Your queue")} aside={<SectionLink href="/admin/support">{translate("All tickets")}</SectionLink>}>
          <div className="-mx-5 -mb-4 flex flex-col">
          <div className={cn("hidden border-y border-line bg-cream px-5 py-2 text-caption font-medium text-ink-muted", GRID)}>
            <span>{translate("Ticket")}</span>
            <span>{translate("Subject")}</span>
            <span>{translate("User")}</span>
            <span>{translate("Priority")}</span>
            <span className="text-right">{translate("Waiting")}</span>
          </div>
          {queue.length === 0 && <p className="px-5 py-8 text-center text-small text-ink-muted">{translate("Nothing is waiting. Enjoy the quiet.")}</p>}
          {queue.map((ticket) => {
            const waited = hoursSince(ticket.createdAt, now);
            return (
              <Link key={ticket.id} href={`/admin/support/${ticket.id}`} className={cn("flex min-h-14 flex-col gap-1 border-b border-surface-sunken px-5 py-2 text-body transition-colors last:border-b-0 hover:bg-cream/60", GRID)}>
                <span className="font-mono text-small font-semibold text-ink-2">#{ticket.id.slice(0, 6)}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold text-ink">{ticket.subject}</span>
                  <span className="text-caption text-ink-muted">{translate(STATUS[ticket.status])}</span>
                </span>
                <span className="truncate text-ink-2">{ticket.platformUser?.name ?? "—"}</span>
                <span>
                  <Chip tone={PRIORITY[ticket.priority].tone} size="sm">
                    {translate(PRIORITY[ticket.priority].label)}
                  </Chip>
                </span>
                <span className={cn("text-small md:text-right", waited >= 24 ? "font-semibold text-expense" : waited >= 6 ? "font-semibold text-warning" : "text-ink-2")}>
                  {waited} {translate("hours")}
                </span>
              </Link>
            );
          })}
          </div>
        </Section>

        <Section title={translate("Most asked for")} aside={<SectionLink href="/admin/feature-requests">{translate("Feature requests")}</SectionLink>}>
          {requests.length === 0 ? (
            <Unavailable>{translate("No requests yet.")}</Unavailable>
          ) : (
            <div className="flex flex-col gap-3">
              {topRequests(requests).map((request) => (
                <div key={request.id} className="flex items-center gap-3 text-body">
                  <span className="flex h-7.5 min-w-11 items-center justify-center gap-0.5 rounded-md bg-surface-sunken px-2 font-bold text-ink tabular-nums">
                    <ChevronUp className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                    {request.voteCount}
                  </span>
                  <span className="min-w-0 flex-1 leading-snug text-ink">{request.title}</span>
                  <Chip tone={REQUEST_STATUS[request.status].tone} size="sm">
                    {translate(REQUEST_STATUS[request.status].label)}
                  </Chip>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
