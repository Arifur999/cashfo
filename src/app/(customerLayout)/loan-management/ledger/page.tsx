import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoanLedgerPageClient } from "@/components/modules/Customer/LoanManagement/LoanLedgerPageClient";
import { LEDGER_CONTACT_COOKIE } from "@/lib/customer/loanDisplay";
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
  const asked = typeof params.contactId === "string" ? params.contactId : "";

  // Every bank/person contact, however many pages the API needs, and who
  // has entries.
  const [contacts, dashboard] = await Promise.all([getAllContacts(activeBusinessId, "LOAN"), getLoanDashboard(activeBusinessId)]);
  const known = (id: string | undefined) => (id && contacts.some((contact) => contact.id === id) ? id : "");
  // The board never shows an empty statement: the one asked for, else the
  // last one shown this session, else the first with entries, else the first.
  const selectedContactId =
    known(asked) ||
    known((await cookies()).get(LEDGER_CONTACT_COOKIE)?.value) ||
    known(dashboard.rows.find((row) => (row.entries ?? 0) > 0)?.contactId) ||
    (contacts.find((contact) => contact.status === "ACTIVE") ?? contacts[0])?.id ||
    "";

  // A running balance only means something for one account at a time.
  const { dateFrom, dateTo } = periodRange(period);
  let statement: LoanStatement | null = null;
  let activity: LoanDashboardRow | null = null;
  if (selectedContactId) {
    statement = await getLoanStatement(activeBusinessId, selectedContactId, { dateFrom, dateTo });
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
      periodEnd={dateTo}
      // A period still running closes today.
      periodTo={dateTo && dateTo < today ? dateTo : today}
    />
  );
}
