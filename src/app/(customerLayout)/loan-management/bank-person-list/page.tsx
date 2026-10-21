import { redirect } from "next/navigation";
import { LoanContactsPageClient } from "@/components/modules/Customer/LoanManagement/LoanContactsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getAllContacts } from "@/lib/customer/contacts";
import { customerPageMetadata } from "@/lib/customer/pageTitle";

export const generateMetadata = () => customerPageMetadata("/loan-management/bank-person-list");

// People & banks: everyone with a loan relationship (category LOAN), all of
// them, so the tab counts and the Pawna / Dena totals count everyone.
export default async function LoanContactsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const contacts = await getAllContacts(activeBusinessId, "LOAN");

  return <LoanContactsPageClient businessId={activeBusinessId} contacts={contacts} currency={activeBusiness?.currency ?? "BDT"} canManage={canManage} canTrade={activeBusiness?.type === "BUSINESS"} />;
}
