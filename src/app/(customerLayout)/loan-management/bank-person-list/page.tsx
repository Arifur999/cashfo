import { redirect } from "next/navigation";
import { LoanContactsPageClient } from "@/components/modules/Customer/LoanManagement/LoanContactsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getContacts } from "@/lib/customer/contacts";

// People & banks: everyone with a loan relationship (category LOAN).
export default async function LoanContactsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const { data: contacts } = await getContacts(activeBusinessId, { category: "LOAN", limit: 100 });

  return <LoanContactsPageClient businessId={activeBusinessId} contacts={contacts} currency={activeBusiness?.currency ?? "BDT"} canManage={canManage} />;
}
