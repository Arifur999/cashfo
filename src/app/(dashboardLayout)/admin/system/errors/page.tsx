import { getErrorLogs } from "@/lib/system";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { ErrorLogsClient } from "@/components/system/ErrorLogsClient";
import { TabsNav } from "@/components/ui/TabsNav";
import { t } from "@/lib/i18n/t";

interface ErrorLogsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ErrorLogsPage({ searchParams }: ErrorLogsPageProps) {
  await requireSuperAdmin();

  const params = await searchParams;
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
  ).toString();

  const { data: errors, meta } = await getErrorLogs(queryString);

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

      <ErrorLogsClient errors={errors} meta={meta} />
    </div>
  );
}
