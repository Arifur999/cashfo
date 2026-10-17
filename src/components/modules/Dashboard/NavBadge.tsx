"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/number";
import type { NavBadgeKind } from "@/lib/navItem";
import { openTicketCount } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import { securityFlagsSummaryQuery } from "@/queries/security.queries";
import { ticketStatsQuery } from "@/queries/ticket.queries";

// The count beside a menu item, as the design's sidebar draws it: amber for
// work waiting (open tickets), coral for something wrong (security flags).
const Count = ({ value, title, tone }: { value: number | undefined; title: string; tone: "warning" | "danger" }) => {
  const { translate } = useLocale();
  if (!value) return null;
  return (
    <span
      title={translate(title)}
      className={cn(
        "flex h-5 min-w-5.5 items-center justify-center rounded-full px-2 text-caption font-bold text-night-ink tabular-nums",
        tone === "danger" ? "bg-night-coral" : "bg-night-amber",
      )}
    >
      {formatNumber(value)}
    </span>
  );
};

const OpenTickets = () => {
  const stats = useQuery(ticketStatsQuery()).data?.data;
  return <Count value={stats && openTicketCount(stats.statusCounts)} title="Open tickets" tone="warning" />;
};

const SecurityFlags = () => {
  const needsLook = useQuery(securityFlagsSummaryQuery()).data?.data.needsLook;
  return <Count value={needsLook} title="Open security flags" tone="danger" />;
};

const BADGES: Record<NavBadgeKind, () => React.ReactNode> = { openTickets: OpenTickets, securityFlags: SecurityFlags };

const NavBadge = ({ kind }: { kind: NavBadgeKind }) => {
  const Badge = BADGES[kind];
  return <Badge />;
};

export default NavBadge;
