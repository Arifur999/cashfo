import { redirect } from "next/navigation";
import { LoanTransactionsPageClient } from "@/components/modules/Customer/LoanManagement/LoanTransactionsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getAllContacts } from "@/lib/customer/contacts";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { type PickedPeriod, periodRange, readPickedPeriod } from "@/lib/customer/period";
import { getAllTransactions } from "@/lib/customer/transactions";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/loan-management/transactions");


export default async function LoanTransactionsPage({ searchParams }: PageProps<"/loan-management/transactions">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  // This year unless the address asks for another period (?period=all for
  // all time; an older ?range= link opens what it meant).
  const today = getAppToday();
  const current = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
  const period: PickedPeriod = params.period === "all" ? { kind: "all" } : readPickedPeriod(params, current, { kind: "year", year: current.year });
  const selectedContactId = typeof params.contactId === "string" ? params.contactId : "";
  const { dateFrom, dateTo } = periodRange(period);

  // Loan contacts only: a trade (BUSINESS) contact books a "loan" as a
  // credit sale or purchase -- revenue or expense, with the wallet ignored --
  // so the entry drawer must not offer one. The list shows those contacts'
  // loans and repayments, not every transaction in the workspace. All of
  // them are read (100 at a time), since the totals add them up.
  const [loanContacts, { data: transactions, complete }] = await Promise.all([
    getAllContacts(activeBusinessId, "LOAN"),
    getAllTransactions(activeBusinessId, {
      contactId: selectedContactId || undefined,
      contactCategory: "LOAN",
      // Loans and repayments, and the profit or interest posted with them.
      transactionTypes: ["SALE", "PURCHASE", "PAYMENT", "INCOME", "EXPENSE"],
      // A charge shows in its entry's Charge column, and each row carries the
      // balance with that bank or person just after it.
      excludeCharges: true,
      withLoanBalance: true,
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
      period={period}
      today={today}
      selectedContactId={selectedContactId}
    />
  );
}
