import { redirect } from "next/navigation";
import { LoanDashboardPageClient } from "@/components/modules/Customer/LoanManagement/LoanDashboardPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getLoanDashboard } from "@/lib/customer/receivablesPayables";

export default async function LoanManagementDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const dashboard = await getLoanDashboard(activeBusinessId);

  return <LoanDashboardPageClient dashboard={dashboard} currency={activeBusiness?.currency ?? "BDT"} />;
}
