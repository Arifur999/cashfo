"use client";

import { useQuery } from "@tanstack/react-query";
import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import SectionCard from "@/components/shared/SectionCard";
import StatsGrid from "@/components/shared/StatsGrid";
import { formatNumber } from "@/lib/number";
import { loginAttemptsSummaryQuery } from "@/queries/security.queries";

const LoginSummary = () => {
  const summary = useQuery(loginAttemptsSummaryQuery()).data?.data;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
      <StatsGrid
        columns={2}
        items={[
          { title: "Failed (24h)", value: formatNumber(summary?.failedLast24h), iconName: "ShieldAlert" },
          { title: "Failed (7d)", value: formatNumber(summary?.failedLast7d), iconName: "AlertOctagon" },
          {
            title: "Locked Out",
            value: formatNumber(summary?.lockedOutAccounts),
            iconName: "Lock",
            description: "5+ failures in the last 15 minutes",
          },
        ]}
      />
      <SectionCard title="Top IPs by Failures" tooltip="IP addresses with the most failed sign-ins over the last 7 days.">
        <HorizontalBarList
          items={(summary?.topIps ?? []).map((entry) => ({ label: entry.ipAddress, value: entry.count, unit: "failed" }))}
          emptyMessage="No failed sign-ins in the last 7 days."
        />
      </SectionCard>
    </div>
  );
};

export default LoginSummary;
