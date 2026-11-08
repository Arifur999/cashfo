import type { Metadata } from "next";
import { PlansPage } from "@/components/modules/Customer/Settings/Plans/PlansPage";
import { getBillingOverviewAction, getBillingPaymentsAction, getBillingPlansAction } from "@/lib/customer/billingActions";
import { getTranslator } from "@/lib/i18n/locale";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t("Plans & billing") };
}

// Settings › Plans (design-v4 UpgradePlan), where every Upgrade and See
// plans button goes (PLANS_ROUTE), and where the billing emails and bell
// rows link. The plans, the customer's own subscription and the first page
// of payments are read here; a failed read arrives as null and the page
// says so with Try again.
export default async function SettingsPlansPage() {
  const [plans, overview, payments] = await Promise.all([getBillingPlansAction(), getBillingOverviewAction(), getBillingPaymentsAction(1, 10)]);
  return (
    <PlansPage
      plans={plans.success ? (plans.data ?? null) : null}
      overview={overview.success ? (overview.data ?? null) : null}
      payments={payments.success ? (payments.data ?? null) : null}
    />
  );
}
