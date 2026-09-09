import { getCurrentAdmin } from "@/lib/adminAuth";
import { getFeatureRequests } from "@/lib/tickets";
import { FeatureRequestsClient } from "@/components/support/FeatureRequestsClient";
import { TabsNav } from "@/components/ui/TabsNav";
import { t } from "@/lib/i18n/t";

interface FeatureRequestsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function FeatureRequestsPage({ searchParams }: FeatureRequestsPageProps) {
  const params = await searchParams;
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
  ).toString();

  const [requests, admin] = await Promise.all([getFeatureRequests(queryString), getCurrentAdmin()]);
  const canManage = admin?.role === "SUPER_ADMIN" || admin?.role === "SUPPORT_ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("Support")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("Support tickets and feature requests.")}</p>
      </div>

      <TabsNav
        tabs={[
          { label: t("Tickets"), href: "/admin/support" },
          { label: t("Feature Requests"), href: "/admin/feature-requests" },
        ]}
      />

      <FeatureRequestsClient requests={requests} canManage={canManage} />
    </div>
  );
}
