"use client";

import { useQuery } from "@tanstack/react-query";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { NavBadgeKind } from "@/lib/navItem";
import { openTicketCount } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import { payoutStatsQuery } from "@/queries/navBadge.queries";
import { securityFlagsSummaryQuery } from "@/queries/security.queries";
import { ticketStatsQuery } from "@/queries/ticket.queries";

// The count beside a menu item, as the AdminSidebar board draws it: amber
// for work waiting (payout requests, open tickets), coral for something
// wrong (security flags), dark figures on both.
const Count = ({ value, title, tone }: { value: number | undefined; title: string; tone: "warning" | "danger" }) => {
  const { translate, locale } = useLocale();
  if (!value) return null;
  return (
    <span
      title={translate(title)}
      className={cn(
        "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] leading-[normal] font-bold text-night-ink tabular-nums",
        tone === "danger" ? "bg-chart-expense" : "bg-warning-fill",
      )}
    >
      {formatCount(value, locale)}
    </span>
  );
};

const PayoutRequests = () => {
  const stats = useQuery(payoutStatsQuery()).data?.data;
  return <Count value={stats?.waiting.count} title="Payout requests to review" tone="warning" />;
};

const OpenTickets = () => {
  const stats = useQuery(ticketStatsQuery()).data?.data;
  return <Count value={stats && openTicketCount(stats.statusCounts)} title="Open tickets" tone="warning" />;
};

const SecurityFlags = () => {
  const needsLook = useQuery(securityFlagsSummaryQuery()).data?.data.needsLook;
  return <Count value={needsLook} title="Open security flags" tone="danger" />;
};

const BADGES: Record<NavBadgeKind, () => React.ReactNode> = { payoutRequests: PayoutRequests, openTickets: OpenTickets, securityFlags: SecurityFlags };

const NavBadge = ({ kind }: { kind: NavBadgeKind }) => {
  const Badge = BADGES[kind];
  return <Badge />;
};

export default NavBadge;
