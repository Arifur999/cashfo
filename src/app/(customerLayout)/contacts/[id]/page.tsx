import { notFound, redirect } from "next/navigation";
import { ContactDetailPageClient, type StatementView } from "@/components/modules/Customer/Books/Contacts/ContactDetailPageClient";
import type { ContactStatement } from "@/lib/customer/api";
import { lastRow, statementRows, statementRowsFromApi } from "@/lib/customer/booksDisplay";
import { getContact, getContactStatement, getContactTransactions } from "@/lib/customer/contacts";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getContactBalanceDetail } from "@/lib/customer/receivablesPayables";
import { requireBusinessWorkspace } from "@/lib/customer/requireBusinessWorkspace";
import { getAppToday } from "@/lib/date";
import { pageHref, pastEnd, readPageParam } from "@/lib/table/pageParams";

// The list's name, read from nothing: Next runs generateMetadata for every
// <Link> prefetch of this page, without rendering the page, so reading the
// record here cost API calls for each row on screen.
export async function generateMetadata({ params }: PageProps<"/contacts/[id]">) {
  const { id } = await params;
  return customerPageMetadata(`/contacts/${id}`);
}

// Rows a statement page holds.
const PAGE_SIZE = 50;

// The statement endpoint's page as the page shows it.
function fromEndpoint(statement: ContactStatement): StatementView {
  const { page, limit, total, totalPages } = statement.meta;
  return {
    rows: statementRowsFromApi(statement.entries),
    paging: { page, totalPages, total, pageSize: limit || PAGE_SIZE, broughtForward: Number(statement.balanceBroughtForward), pageOpening: Number(statement.pageOpeningBalance), pageClosing: Number(statement.pageClosingBalance) },
    lastCredit: statement.lastSale ? { date: statement.lastSale.date, kind: statement.lastSale.kind } : null,
    lastPayment: statement.lastPayment ? { date: statement.lastPayment.date } : null,
    truncated: false,
    hasEntries: total > 0 || statement.lastSale !== null || statement.lastPayment !== null,
  };
}

// Books › one customer or supplier, with their statement (50 rows a page)
// and what is owed.
export default async function ContactDetailPage({ params, searchParams }: PageProps<"/contacts/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const books = await requireBusinessWorkspace();
  if (!books.ok) return books.notice;
  const { businessId: activeBusinessId, business: activeBusiness } = books;
  const page = readPageParam(sp);

  const [contact, detail, statement] = await Promise.all([getContact(activeBusinessId, id), getContactBalanceDetail(activeBusinessId, id), getContactStatement(activeBusinessId, id, { page, limit: PAGE_SIZE })]);
  if (!contact) notFound();

  let view: StatementView;
  if (statement) {
    // A stale ?page= past the end opens the last page instead of an empty one.
    const last = pastEnd(page, statement.meta.totalPages, statement.meta.total);
    if (last !== null) redirect(pageHref(`/contacts/${id}`, sp, last));
    view = fromEndpoint(statement);
  } else {
    // A backend from before the statement endpoint: the newest 50 postings,
    // with the balance worked out here from the contact's opening balance.
    const transactions = await getContactTransactions(activeBusinessId, id);
    const rows = statementRows(transactions.data, contact.openingBalance);
    const lastCredit = lastRow(rows, ["sale", "purchase"]);
    const lastPayment = lastRow(rows, ["received", "paid"]);
    view = {
      rows,
      paging: null,
      lastCredit: lastCredit ? { date: lastCredit.date, kind: lastCredit.kind } : null,
      lastPayment: lastPayment ? { date: lastPayment.date } : null,
      truncated: transactions.meta.total > transactions.data.length,
      hasEntries: transactions.meta.total > 0,
    };
  }

  const canManage = activeBusiness.role === "OWNER" || activeBusiness.role === "ACCOUNTANT";

  return <ContactDetailPageClient businessId={activeBusinessId} contact={contact} detail={detail} statement={view} canManage={canManage} currency={activeBusiness.currency} today={getAppToday()} />;
}
