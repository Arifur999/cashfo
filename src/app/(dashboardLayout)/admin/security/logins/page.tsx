import { AlertOctagon, Lock, ShieldAlert } from "lucide-react";
import { getLoginAttempts, getLoginAttemptsSummary } from "@/lib/security";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { HorizontalBarList } from "@/components/analytics/HorizontalBarList";
import { SectionCard } from "@/components/analytics/SectionCard";
import { SummaryCard } from "@/components/payments/SummaryCard";
import { LoginAttemptsTable } from "@/components/security/LoginAttemptsTable";
import { TabsNav } from "@/components/ui/TabsNav";
import { t } from "@/lib/i18n/t";

interface LoginMonitoringPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function LoginMonitoringPage({ searchParams }: LoginMonitoringPageProps) {
  await requireSuperAdmin();

  const params = await searchParams;
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
  ).toString();

  const [{ data: attempts, meta }, summary] = await Promise.all([getLoginAttempts(queryString), getLoginAttemptsSummary()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("Security & Audit")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("Audit trail, login monitoring, suspicious activity, and admin accounts.")}</p>
      </div>

      <TabsNav
        tabs={[
          { label: t("Audit Log"), href: "/admin/security", exact: true },
          { label: t("Login Monitoring"), href: "/admin/security/logins" },
          { label: t("Suspicious Activity"), href: "/admin/security/flags" },
          { label: t("Admin Accounts"), href: "/admin/security/admins" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard icon={ShieldAlert} label={t("Failed Logins (24h)")} value={String(summary.failedLast24h)} />
        <SummaryCard icon={AlertOctagon} label={t("Failed Logins (7d)")} value={String(summary.failedLast7d)} />
        <SummaryCard icon={Lock} label={t("Locked-out Accounts")} value={String(summary.lockedOutAccounts)} />
      </div>

      <SectionCard title={t("Top IPs by Failures")} tooltip={t("IP addresses with the most failed login attempts in the last 7 days.")}>
        <HorizontalBarList
          items={summary.topIps.map((ip) => ({ label: ip.ipAddress, value: ip.count }))}
          emptyMessage={t("No failed login attempts in the last 7 days.")}
        />
      </SectionCard>

      <LoginAttemptsTable attempts={attempts} meta={meta} />
    </div>
  );
}
