import { redirect } from "next/navigation";
import { LoanLedgerPageClient } from "@/components/modules/Customer/LoanManagement/LoanLedgerPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import type { LoanStatement } from "@/lib/customer/api";
import { getCurrentUser } from "@/lib/customer/auth";
import { getAllContacts } from "@/lib/customer/contacts";
import { isIsoDay, resolveDateRange, type DateRangePreset } from "@/lib/customer/dateRangePresets";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getLoanStatement } from "@/lib/customer/receivablesPayables";
import { getAppToday } from "@/lib/date";

const PAGE = "/loan-management/ledger";

// The route's name only: Next runs a page's metadata for every <Link>
// prefetch, so reading the contact here would cost API calls for each
// person on screen.
export const generateMetadata = () => customerPageMetadata(PAGE);

const PRESETS: DateRangePreset[] = ["all", "this-year", "last-year", "custom"];

export default async function LoanLedgerPage({ searchParams }: PageProps<"/loan-management/ledger">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  const range = PRESETS.find((preset) => preset === params.range) ?? "all";
  const customFrom = isIsoDay(params.dateFrom) ? params.dateFrom : undefined;
  const customTo = isIsoDay(params.dateTo) ? params.dateTo : undefined;
  const selectedContactId = typeof params.contactId === "string" ? params.contactId : "";

  // Every bank/person contact, however many pages the API needs.
  const contacts = await getAllContacts(activeBusinessId, "LOAN");

  // A running balance only means something for one account at a time, so
  // nothing loads until a bank or person is picked.
  const { dateFrom, dateTo } = resolveDateRange(range, customFrom, customTo);
  let statement: LoanStatement | null = null;
  if (selectedContactId) {
    statement = await getLoanStatement(activeBusinessId, selectedContactId, { dateFrom, dateTo });
  }

  return (
    <LoanLedgerPageClient
      businessId={activeBusinessId}
      contacts={contacts}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
      canTrade={activeBusiness?.type === "BUSINESS"}
      range={range}
      selectedContactId={selectedContactId}
      statement={statement}
      customFrom={customFrom}
      customTo={customTo}
      periodFrom={dateFrom}
      periodTo={dateTo ?? getAppToday()}
    />
  );
}
