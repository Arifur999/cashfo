import { getFeatureFlags } from "@/lib/system";
import { getSubscriptionPlanOptions } from "@/lib/subscriptionPlans";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { FeatureFlagsClient } from "@/components/system/FeatureFlagsClient";
import { TabsNav } from "@/components/ui/TabsNav";
import { t } from "@/lib/i18n/t";

export default async function FeatureFlagsPage() {
  await requireSuperAdmin();

  const [flags, planOptions] = await Promise.all([getFeatureFlags(), getSubscriptionPlanOptions()]);

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

      <FeatureFlagsClient flags={flags} planOptions={planOptions} />
    </div>
  );
}
