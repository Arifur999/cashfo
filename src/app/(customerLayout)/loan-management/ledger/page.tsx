import { redirect } from "next/navigation";
import { LoanLedgerPageClient } from "@/components/modules/Customer/LoanManagement/LoanLedgerPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getContacts } from "@/lib/customer/contacts";
import { getCurrentUser } from "@/lib/customer/auth";
import { resolveDateRange, type DateRangePreset } from "@/lib/customer/dateRangePresets";
import { getLoanStatement } from "@/lib/customer/receivablesPayables";
import type { LoanStatement } from "@/lib/customer/api";

export default async function LoanLedgerPage({ searchParams }: PageProps<"/loan-management/ledger">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);

  const range = (typeof params.range === "string" ? params.range : "all") as DateRangePreset;
  const selectedContactId = typeof params.contactId === "string" ? params.contactId : "";

  // Not filtered by category -- see loan-management/transactions/page.tsx's comment.
  // Bank/person contacts, up to the API's 100 (it stopped at the default 20).
  const { data: loanContacts } = await getContacts(activeBusinessId, { category: "LOAN", limit: 100 });

  // The whole point of this page (per the reference layout): nothing is
  // generated until a Bank/Person is actually picked -- no default "all
  // contacts" statement, since a running balance only means something for
  // ONE account at a time.
  let statement: LoanStatement | null = null;
  if (selectedContactId) {
    const { dateFrom, dateTo } = resolveDateRange(range);
    statement = await getLoanStatement(activeBusinessId, selectedContactId, { dateFrom, dateTo });
  }

  return (
    <LoanLedgerPageClient
      loanContacts={loanContacts}
      currency={activeBusiness?.currency ?? "BDT"}
      range={range}
      selectedContactId={selectedContactId}
      statement={statement}
    />
  );
}
