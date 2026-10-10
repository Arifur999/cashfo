import { AlertTriangle, Clock, Inbox, Timer } from "lucide-react";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { getAdminOptions, getTicketStats, getTickets } from "@/lib/tickets";
import { SummaryCard } from "@/components/payments/SummaryCard";
import { TicketsTableClient } from "@/components/support/TicketsTableClient";
import { TabsNav } from "@/components/ui/TabsNav";
import { t } from "@/lib/i18n/t";

interface SupportPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const params = await searchParams;
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
  ).toString();

  const [{ data: tickets, meta }, stats, admins, admin] = await Promise.all([
    getTickets(queryString),
    getTicketStats(),
    getAdminOptions(),
    getCurrentAdmin(),
  ]);

  const canManage = admin?.role === "SUPER_ADMIN" || admin?.role === "SUPPORT_ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("Support")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("Support tickets and feature requests.")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={Inbox} label={t("Open Tickets")} value={String(stats.openCount)} />
        <SummaryCard icon={Clock} label={t("In Progress")} value={String(stats.inProgressCount)} />
        <SummaryCard icon={Timer} label={t("Avg Resolution Time")} value={`${stats.avgResolutionHours}h`} />
        <SummaryCard icon={AlertTriangle} label={t("Urgent")} value={String(stats.urgentCount)} />
      </div>

      <TabsNav
        tabs={[
          { label: t("Tickets"), href: "/admin/support" },
          { label: t("Feature Requests"), href: "/admin/feature-requests" },
        ]}
      />

      <TicketsTableClient tickets={tickets} meta={meta} admins={admins} canManage={canManage} />
    </div>
  );
}
