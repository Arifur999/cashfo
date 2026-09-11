import { redirect } from "next/navigation";
import { LoanLedgerPageClient } from "@/components/loan-management/LoanLedgerPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getContacts } from "@/lib/contacts";
import { getCurrentUser } from "@/lib/auth";
import { resolveDateRange, type DateRangePreset } from "@/lib/dateRangePresets";
import { getLoanStatement } from "@/lib/receivablesPayables";
import type { LoanStatement } from "@/lib/api";

export default async function LoanLedgerPage({ searchParams }: PageProps<"/loan-management/ledger">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);

  const range = (typeof params.range === "string" ? params.range : "all") as DateRangePreset;
  const selectedContactId = typeof params.contactId === "string" ? params.contactId : "";

  const { data: loanContacts } = await getContacts(activeBusinessId, { category: "LOAN" });

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
