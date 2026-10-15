import { redirect } from "next/navigation";
import { LoanTransactionsPageClient } from "@/components/modules/Customer/LoanManagement/LoanTransactionsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getContacts } from "@/lib/customer/contacts";
import { resolveDateRange, type DateRangePreset } from "@/lib/customer/dateRangePresets";
import { getAllTransactions } from "@/lib/customer/transactions";

const PRESETS: DateRangePreset[] = ["all", "this-month", "last-month", "this-year"];

export default async function LoanTransactionsPage({ searchParams }: PageProps<"/loan-management/transactions">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  const range = PRESETS.find((preset) => preset === params.range) ?? "all";
  const selectedContactId = typeof params.contactId === "string" ? params.contactId : "";
  const { dateFrom, dateTo } = resolveDateRange(range);

  // Loan contacts only: a trade (BUSINESS) contact books a "loan" as a
  // credit sale or purchase -- revenue or expense, with the wallet ignored --
  // so the entry drawer must not offer one. The list shows those contacts'
  // loans and repayments, not every transaction in the workspace. All of
  // them are read (100 at a time), since the totals add them up.
  const [{ data: loanContacts }, { data: transactions, complete }] = await Promise.all([
    getContacts(activeBusinessId, { category: "LOAN", limit: 100 }),
    getAllTransactions(activeBusinessId, {
      contactId: selectedContactId || undefined,
      contactCategory: "LOAN",
      transactionTypes: ["SALE", "PURCHASE", "PAYMENT"],
      dateFrom,
      dateTo,
    }),
  ]);

  return (
    <LoanTransactionsPageClient
      businessId={activeBusinessId}
      transactions={transactions}
      complete={complete}
      loanContacts={loanContacts}
      canManage={canManage}
      currency={activeBusiness?.currency ?? "BDT"}
      range={range}
      selectedContactId={selectedContactId}
    />
  );
}
