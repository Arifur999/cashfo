import { redirect } from "next/navigation";
import { LoanLedgerPageClient } from "@/components/modules/Customer/LoanManagement/LoanLedgerPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import type { LoanDashboardRow, LoanStatement } from "@/lib/customer/api";
import { getCurrentUser } from "@/lib/customer/auth";
import { getAllContacts } from "@/lib/customer/contacts";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { type PickedPeriod, periodRange, readPickedPeriod } from "@/lib/customer/period";
import { getLoanDashboard, getLoanStatement } from "@/lib/customer/receivablesPayables";
import { getAppToday } from "@/lib/date";

const PAGE = "/loan-management/ledger";

// The route's name only: Next runs a page's metadata for every <Link>
// prefetch, so reading the contact here would cost API calls for each
// person on screen.
export const generateMetadata = () => customerPageMetadata(PAGE);

export default async function LoanLedgerPage({ searchParams }: PageProps<"/loan-management/ledger">) {
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

  // Every bank/person contact, however many pages the API needs.
  const contacts = await getAllContacts(activeBusinessId, "LOAN");

  // A running balance only means something for one account at a time, so
  // nothing loads until a bank or person is picked.
  const { dateFrom, dateTo } = periodRange(period);
  let statement: LoanStatement | null = null;
  let activity: LoanDashboardRow | null = null;
  if (selectedContactId) {
    const [loaded, dashboard] = await Promise.all([getLoanStatement(activeBusinessId, selectedContactId, { dateFrom, dateTo }), getLoanDashboard(activeBusinessId)]);
    statement = loaded;
    activity = dashboard.rows.find((row) => row.contactId === selectedContactId) ?? null;
  }

  return (
    <LoanLedgerPageClient
      businessId={activeBusinessId}
      contacts={contacts}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
      canTrade={activeBusiness?.type === "BUSINESS"}
      period={period}
      today={today}
      selectedContactId={selectedContactId}
      statement={statement}
      activity={activity}
      periodFrom={dateFrom}
      // A period still running closes today.
      periodTo={dateTo && dateTo < today ? dateTo : today}
    />
  );
}
