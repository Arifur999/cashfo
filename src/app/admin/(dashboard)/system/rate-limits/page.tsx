import { AlertOctagon, TrendingUp } from "lucide-react";
import { getRateLimits, getRateLimitsSummary } from "@/lib/system";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { SummaryCard } from "@/components/payments/SummaryCard";
import { RateLimitsClient } from "@/components/system/RateLimitsClient";
import { TabsNav } from "@/components/ui/TabsNav";
import { t } from "@/lib/i18n/t";

interface RateLimitsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function RateLimitsPage({ searchParams }: RateLimitsPageProps) {
  await requireSuperAdmin();

  const params = await searchParams;
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
  ).toString();

  const [{ data: logs, meta }, summary] = await Promise.all([getRateLimits(queryString), getRateLimitsSummary()]);
  const topEndpoint = summary.topEndpoints[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("System")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("Backups, feature flags, error logs, and API rate limits.")}</p>
      </div>

      <TabsNav
        tabs={[
          { label: t("Backups"), href: "/admin/system", exact: true },
          { label: t("Feature Flags"), href: "/admin/system/feature-flags" },
          { label: t("Error Logs"), href: "/admin/system/errors" },
          { label: t("Rate Limits"), href: "/admin/system/rate-limits" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard
          icon={TrendingUp}
          label={t("Top Endpoint by Volume")}
          value={topEndpoint ? `${topEndpoint.endpoint} (${topEndpoint.requestCount})` : t("No data")}
        />
        <SummaryCard icon={AlertOctagon} label={t("Limit-Exceeded Events (Today)")} value={String(summary.exceededToday)} />
      </div>

      <RateLimitsClient logs={logs} meta={meta} />
    </div>
  );
}
