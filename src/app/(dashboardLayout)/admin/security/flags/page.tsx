import { getFlags } from "@/lib/security";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { FlagsClient } from "@/components/security/FlagsClient";
import { TabsNav } from "@/components/ui/TabsNav";
import { t } from "@/lib/i18n/t";

interface FlagsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function FlagsPage({ searchParams }: FlagsPageProps) {
  await requireSuperAdmin();

  const params = await searchParams;
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
  ).toString();

  const flags = await getFlags(queryString);

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

      <FlagsClient flags={flags} />
    </div>
  );
}
