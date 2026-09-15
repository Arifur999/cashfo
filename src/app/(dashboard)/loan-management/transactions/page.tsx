import { redirect } from "next/navigation";
import { LoanTransactionsPageClient } from "@/components/loan-management/LoanTransactionsPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getContacts } from "@/lib/contacts";
import { getCurrentUser } from "@/lib/auth";
import { resolveDateRange, type DateRangePreset } from "@/lib/dateRangePresets";
import { getTransactions } from "@/lib/transactions";

export default async function LoanTransactionsPage({ searchParams }: PageProps<"/loan-management/transactions">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  const range = (typeof params.range === "string" ? params.range : "all") as DateRangePreset;
  const selectedContactId = typeof params.contactId === "string" ? params.contactId : "";
  const { dateFrom, dateTo } = resolveDateRange(range);

  // Not filtered by category -- Loan Management and Dena-Pawna share one
  // contact list and one transaction history now (see
  // ReceivablesPayablesService.getLoanDashboard()'s comment).
  const { data: loanContacts } = await getContacts(activeBusinessId, {});
  const { data: transactions } = await getTransactions(activeBusinessId, {
    contactId: selectedContactId || undefined,
    dateFrom,
    dateTo,
    limit: 100,
  });

  return (
    <LoanTransactionsPageClient
      businessId={activeBusinessId}
      transactions={transactions}
      loanContacts={loanContacts}
      canManage={canManage}
      currency={activeBusiness?.currency ?? "BDT"}
      range={range}
      selectedContactId={selectedContactId}
    />
  );
}
