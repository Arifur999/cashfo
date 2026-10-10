import { getCurrentAdmin } from "@/lib/adminAuth";
import { getNotificationCampaigns, getNotificationTemplates } from "@/lib/notifications";
import { getSubscriptionPlanOptions } from "@/lib/subscriptionPlans";
import { CampaignsClient } from "@/components/notifications/CampaignsClient";
import { TabsNav } from "@/components/ui/TabsNav";
import { t } from "@/lib/i18n/t";

export default async function CampaignsPage() {
  const [campaigns, templates, planOptions, admin] = await Promise.all([
    getNotificationCampaigns(),
    getNotificationTemplates(),
    getSubscriptionPlanOptions(),
    getCurrentAdmin(),
  ]);
  const canManage = admin?.role === "SUPER_ADMIN" || admin?.role === "SUPPORT_ADMIN";

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

      <CampaignsClient campaigns={campaigns} templates={templates} planOptions={planOptions} canManage={canManage} />
    </div>
  );
}
