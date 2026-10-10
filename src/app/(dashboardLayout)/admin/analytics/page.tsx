import { getCohorts, getDevices, getEngagement, getFeatureUsage, getGeography } from "@/lib/analytics";
import { AnalyticsClient, type RangePreset } from "@/components/analytics/AnalyticsClient";
import { t } from "@/lib/i18n/t";

interface AnalyticsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

function resolveRange(params: Record<string, string | undefined>): { range: RangePreset; from: string; to: string } {
  const rawRange = params.range;
  const range: RangePreset = rawRange === "7" || rawRange === "90" || rawRange === "custom" ? rawRange : "30";
  const todayStr = new Date().toISOString().slice(0, 10);

  if (range === "custom" && params.from && params.to) {
    return { range, from: params.from, to: params.to };
  }

  const days = range === "90" ? 90 : range === "7" ? 7 : 30;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - (days - 1));

  return { range, from: fromDate.toISOString().slice(0, 10), to: todayStr };
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const params = await searchParams;
  const { range, from, to } = resolveRange(params);
  const queryString = new URLSearchParams({ from, to }).toString();

  const [featureUsage, engagement, cohorts, geography, devices] = await Promise.all([
    getFeatureUsage(queryString),
    getEngagement(queryString),
    getCohorts(),
    getGeography(),
    getDevices(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("Analytics")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("Feature usage, engagement, retention, and reach.")}</p>
      </div>

      <AnalyticsClient
        range={range}
        from={from}
        to={to}
        featureUsage={featureUsage}
        engagement={engagement}
        cohorts={cohorts}
        geography={geography}
        devices={devices}
      />
    </div>
  );
}
