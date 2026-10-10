import { getNotificationLogs } from "@/lib/notifications";
import { LogsClient } from "@/components/notifications/LogsClient";
import { TabsNav } from "@/components/ui/TabsNav";
import { t } from "@/lib/i18n/t";

interface HistoryPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
  ).toString();

  const { data: logs, meta } = await getNotificationLogs(queryString);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("Notifications")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("Templates, send history, and bulk campaigns.")}</p>
      </div>

      <TabsNav
        tabs={[
          { label: t("Templates"), href: "/admin/notifications", exact: true },
          { label: t("Send History"), href: "/admin/notifications/history" },
          { label: t("Campaigns"), href: "/admin/notifications/campaigns" },
        ]}
      />

      <LogsClient logs={logs} meta={meta} />
    </div>
  );
}
