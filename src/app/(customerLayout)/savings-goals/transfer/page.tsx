import { redirect } from "next/navigation";
import { SavingsTransferPageClient } from "@/components/modules/Customer/SavingsGoals/SavingsTransferPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getSavingsGoals, getSavingsTransfers } from "@/lib/customer/savingsGoals";
import { getAppToday } from "@/lib/date";
import { getTranslator } from "@/lib/i18n/locale";

// All moves sits under Goals in the menu; the tab names it.
export async function generateMetadata() {
  const { t } = await getTranslator();
  return customerPageMetadata("/savings-goals/transfer", { record: t("All moves") });
}

export default async function SavingsTransferPage({ searchParams }: PageProps<"/savings-goals/transfer">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  const [goals, transfers] = await Promise.all([getSavingsGoals(activeBusinessId), getSavingsTransfers(activeBusinessId)]);

  return (
    <SavingsTransferPageClient
      businessId={activeBusinessId}
      goals={goals}
      transfers={transfers}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
      today={getAppToday()}
      presetTo={typeof params.to === "string" ? params.to : undefined}
    />
  );
}
