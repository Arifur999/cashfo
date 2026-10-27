import { Star } from "lucide-react";
import type { Metadata } from "next";
import EmptyState from "@/components/smartly/EmptyState";
import { getTranslator } from "@/lib/i18n/locale";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t("Plans") };
}

// Where the sidebar's Upgrade and See plans go (PLANS_ROUTE). A placeholder
// until the plans page (design-v4 UpgradePlan) is built: the app sells no
// plan yet, so it says so inside the Settings shell, which heads it "Plans".
export default async function SettingsPlansPage() {
  const { t } = await getTranslator();
  return <EmptyState icon={<Star />} title={t("Paid plans are coming soon.")} />;
}
