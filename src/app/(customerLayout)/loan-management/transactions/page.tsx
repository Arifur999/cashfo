import { redirect } from "next/navigation";
import { LoanTransactionsPageClient } from "@/components/modules/Customer/LoanManagement/LoanTransactionsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getContacts } from "@/lib/customer/contacts";
import { getCurrentUser } from "@/lib/customer/auth";
import { resolveDateRange, type DateRangePreset } from "@/lib/customer/dateRangePresets";
import { getTransactions } from "@/lib/customer/transactions";

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

  // Loan contacts only: a trade (BUSINESS) contact books a "loan" as a
  // credit sale or purchase -- revenue or expense, with the wallet ignored --
  // so the New Transaction form must not offer one. The list shows those
  // contacts' loans and repayments, not every transaction in the workspace.
  const { data: loanContacts } = await getContacts(activeBusinessId, { category: "LOAN", limit: 100 });
  const { data: transactions } = await getTransactions(activeBusinessId, {
    contactId: selectedContactId || undefined,
    contactCategory: "LOAN",
    transactionTypes: ["SALE", "PURCHASE", "PAYMENT"],
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
