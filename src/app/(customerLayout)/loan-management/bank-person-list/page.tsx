import { redirect } from "next/navigation";
import { BankPersonListPageClient } from "@/components/modules/Customer/LoanManagement/BankPersonListPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getContacts } from "@/lib/customer/contacts";
import { getCurrentUser } from "@/lib/customer/auth";

export default async function BankPersonListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const { data: contacts } = await getContacts(activeBusinessId, { category: "LOAN", limit: 100 });

  return (
    <BankPersonListPageClient businessId={activeBusinessId} contacts={contacts} canManage={canManage} currency={activeBusiness?.currency ?? "BDT"} />
  );
}
