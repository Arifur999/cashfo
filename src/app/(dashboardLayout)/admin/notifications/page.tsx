import { getCurrentAdmin } from "@/lib/adminAuth";
import { getNotificationTemplates } from "@/lib/notifications";
import { TemplatesClient } from "@/components/notifications/TemplatesClient";
import { TabsNav } from "@/components/ui/TabsNav";
import { t } from "@/lib/i18n/t";

export default async function NotificationsPage() {
  const [templates, admin] = await Promise.all([getNotificationTemplates(), getCurrentAdmin()]);
  const canManage = admin?.role === "SUPER_ADMIN" || admin?.role === "CONTENT_ADMIN";

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

      <TemplatesClient templates={templates} canManage={canManage} />
    </div>
  );
}
