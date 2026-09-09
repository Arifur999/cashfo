import { getFullAdminList } from "@/lib/security";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { AdminAccountsClient } from "@/components/security/AdminAccountsClient";
import { TabsNav } from "@/components/ui/TabsNav";
import { t } from "@/lib/i18n/t";

export default async function AdminAccountsPage() {
  const currentAdmin = await requireSuperAdmin();
  const admins = await getFullAdminList();

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

      <AdminAccountsClient admins={admins} currentAdminId={currentAdmin?.id ?? ""} />
    </div>
  );
}
