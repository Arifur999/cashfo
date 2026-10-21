import { redirect } from "next/navigation";
import { LoanDashboardPageClient } from "@/components/modules/Customer/LoanManagement/LoanDashboardPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getAllContacts } from "@/lib/customer/contacts";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getLoanDashboard } from "@/lib/customer/receivablesPayables";

export const generateMetadata = () => customerPageMetadata("/loan-management/dashboard");

export default async function LoanManagementDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  // Every loan contact beside the dashboard rows: their kind and photo,
  // which rows are loans at all, and the list the entry drawer offers.
  const [dashboard, contacts] = await Promise.all([getLoanDashboard(activeBusinessId), getAllContacts(activeBusinessId, "LOAN")]);

  return <LoanDashboardPageClient businessId={activeBusinessId} dashboard={dashboard} contacts={contacts} currency={activeBusiness?.currency ?? "BDT"} canManage={canManage} canTrade={activeBusiness?.type === "BUSINESS"} />;
}
