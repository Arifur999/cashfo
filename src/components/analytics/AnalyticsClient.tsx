"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { CohortRow, DeviceBreakdownEntry, EngagementPoint, FeatureUsageEntry, GeographyResponse } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { CohortRetentionGrid } from "./CohortRetentionGrid";
import { DeviceBreakdownChart } from "./DeviceBreakdownChart";
import { EngagementChart } from "./EngagementChart";
import { FeatureUsageChart } from "./FeatureUsageChart";
import { GeographyList } from "./GeographyList";
import { SectionCard } from "./SectionCard";

export type RangePreset = "7" | "30" | "90" | "custom";

interface AnalyticsClientProps {
  range: RangePreset;
  from: string;
  to: string;
  featureUsage: FeatureUsageEntry[];
  engagement: EngagementPoint[];
  cohorts: CohortRow[];
  geography: GeographyResponse;
  devices: DeviceBreakdownEntry[];
}

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "custom", label: "Custom" },
];

export function AnalyticsClient({ range, from, to, featureUsage, engagement, cohorts, geography, devices }: AnalyticsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function selectPreset(preset: RangePreset) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", preset);
    if (preset !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    startTransition(() => router.push(`/admin/analytics?${params.toString()}`));
  }

  function applyCustomRange() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", customFrom);
    params.set("to", customTo);
    startTransition(() => router.push(`/admin/analytics?${params.toString()}`));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
        <span className="text-sm font-medium text-neutral-700">{t("Date range")}:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => selectPreset(preset.value)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
              range === preset.value ? "bg-brand-primary text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {t(preset.label)}
          </button>
        ))}
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-xl border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-brand-primary"
            />
            <span className="text-neutral-400">–</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-xl border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-brand-primary"
            />
            <button
              type="button"
              onClick={applyCustomRange}
              className="rounded-xl bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary-hover"
            >
              {t("Apply")}
            </button>
          </div>
        )}
      </div>

      <div className={`space-y-6 transition-opacity ${isPending ? "opacity-60" : ""}`}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SectionCard title={t("Feature Usage")} tooltip={t("How many times each action was performed in the selected date range.")}>
            <FeatureUsageChart data={featureUsage} />
          </SectionCard>
          <SectionCard
            title={t("Engagement (DAU/WAU)")}
            tooltip={t("Daily Active Users and Weekly Active Users -- distinct users with at least one action that day / in the trailing 7 days.")}
          >
            <EngagementChart data={engagement} />
          </SectionCard>
        </div>

        <SectionCard
          title={t("Cohort Retention")}
          tooltip={t("Of users who signed up in a given month, the % who were still active in each month since signup.")}
        >
          <CohortRetentionGrid rows={cohorts} />
        </SectionCard>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SectionCard title={t("Geographic Distribution")} tooltip={t("Top cities by number of distinct users.")}>
            <GeographyList cities={geography.cities} />
          </SectionCard>
          <SectionCard title={t("Device Breakdown")} tooltip={t("Share of recorded activity by device type.")}>
            <DeviceBreakdownChart data={devices} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
