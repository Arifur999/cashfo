import { redirect } from "next/navigation";
import { BankPersonListPageClient } from "@/components/loan-management/BankPersonListPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getContacts } from "@/lib/contacts";
import { getCurrentUser } from "@/lib/auth";

export default async function BankPersonListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const { data: contacts } = await getContacts(activeBusinessId, { category: "LOAN" });

  return (
    <BankPersonListPageClient businessId={activeBusinessId} contacts={contacts} canManage={canManage} currency={activeBusiness?.currency ?? "BDT"} />
  );
}
