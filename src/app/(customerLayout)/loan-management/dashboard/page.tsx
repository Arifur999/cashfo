import { redirect } from "next/navigation";
import { LoanDashboardPageClient } from "@/components/modules/Customer/LoanManagement/LoanDashboardPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getContacts } from "@/lib/customer/contacts";
import { getLoanDashboard } from "@/lib/customer/receivablesPayables";

export default async function LoanManagementDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  // The contacts beside the dashboard rows: their kind and photo, and the
  // list the entry drawer offers.
  const [dashboard, { data: contacts }] = await Promise.all([getLoanDashboard(activeBusinessId), getContacts(activeBusinessId, { category: "LOAN", limit: 100 })]);

  return <LoanDashboardPageClient businessId={activeBusinessId} dashboard={dashboard} contacts={contacts} currency={activeBusiness?.currency ?? "BDT"} canManage={canManage} />;
}
