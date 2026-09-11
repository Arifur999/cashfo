import { redirect } from "next/navigation";
import { LoanTransactionsPageClient } from "@/components/loan-management/LoanTransactionsPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getCurrentUser } from "@/lib/auth";
import { getTransactions } from "@/lib/transactions";

export default async function LoanTransactionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const { data: transactions } = await getTransactions(activeBusinessId, { contactCategory: "LOAN", limit: 100 });

  return <LoanTransactionsPageClient transactions={transactions} currency={activeBusiness?.currency ?? "BDT"} />;
}
