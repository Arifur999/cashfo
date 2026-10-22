"use client";

import { AlertTriangle, Archive, Download, HandCoins, Info, Pencil, Printer, ShoppingBag, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Loader from "@/components/shared/Loader";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { Contact, ContactBalanceDetail } from "@/lib/customer/api";
import { agingFromInvoices, agingShares, booksDate, CONTACT_TYPE_WORD, contactOwed, isCustomer, isSupplier, statementRowsFromApi, type SideOwed, type StatementKind, type StatementRow } from "@/lib/customer/booksDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { downloadCsv } from "@/lib/download";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { toCsv } from "@/lib/table/csv";
import { pageHref } from "@/lib/table/pageParams";
import { cn } from "@/lib/utils";
import { AgingBar, AgingLegend } from "../shared/Aging";
import { BackLink } from "../shared/BackLink";
import { exportStatementAction } from "../shared/exportActions";
import { ContactDrawer } from "./ContactDrawer";
import { PaymentDrawer } from "./PaymentDrawer";
import { SaleDrawer } from "./SaleDrawer";
import { STATEMENT_COLUMNS, STATEMENT_KIND_LABEL, StatementTable, type StatementPaging, type StatementSide } from "./StatementTable";

export interface StatementView {
  rows: StatementRow[];
  // The statement endpoint's pages of 50; null for an older backend, whose
  // rows are the newest 50 postings worked out here.
  paging: StatementPaging | null;
  lastCredit: { date: string; kind: StatementKind } | null;
  lastPayment: { date: string } | null;
  // Older backend only: there were more postings than the 50 read.
  truncated: boolean;
  // Anything posted with them at all: Remove then archives instead.
  hasEntries: boolean;
}

interface ContactDetailPageClientProps {
  businessId: string;
  contact: Contact;
  detail: ContactBalanceDetail;
  statement: StatementView;
  canManage: boolean;
  currency: string;
  today: string;
}

type Open = { kind: "sale" | "purchase" } | { kind: "payment"; direction: "RECEIVABLE" | "PAYABLE" } | { kind: "edit" } | null;

const STATEMENT_ID = "contact-statement";

// What an export holds at most (exportActions.ts stops there too).
const EXPORT_LIMIT = 5000;

// Books › one customer or supplier: what they owe (or you owe), every sale
// and payment, how old the debt is, and how to reach them.
export function ContactDetailPageClient({ businessId, contact, detail, statement, canManage, currency, today }: ContactDetailPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pdfExportOn = useFeature("pdf_export");
  const [open, setOpen] = useState<Open>(null);
  const [exporting, startExport] = useTransition();

  const customer = isCustomer(contact);
  const supplier = isSupplier(contact);
  const side: StatementSide = customer && supplier ? "both" : supplier ? "supplier" : "customer";
  const balance = Number(contact.currentBalance);
  const loan = contact.category === "LOAN";
  const archived = contact.status === "ARCHIVED";
  const path = `/contacts/${contact.id}`;

  // What each side still owes: the unpaid sales or purchases, and apart
  // from them what was owed from before Books.
  const owed = contactOwed(detail, balance);
  const receivableOpen = owed.receivable.total > 0;
  const payableOpen = owed.payable.total > 0;

  const headline = balance > 0 ? t("{name} owes you", { name: contact.name }) : balance < 0 ? t("You owe {name}", { name: contact.name }) : t("Settled with {name}", { name: contact.name });
  const day = (value: string) => booksDate(value, locale, { today, weekday: true });
  const lastLine = [statement.lastCredit ? t(statement.lastCredit.kind === "sale" ? "Last sale {date}" : "Last purchase {date}", { date: day(statement.lastCredit.date) }) : t("No sales or purchases yet"), statement.lastPayment ? t("Last payment {date}", { date: day(statement.lastPayment.date) }) : null].filter(Boolean).join(" · ");

  const details: [string, React.ReactNode][] = [
    [t("Type"), t(CONTACT_TYPE_WORD[contact.type])],
    [
      t("Phone"),
      contact.phone ? (
        <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="font-mono text-small text-ink-2 hover:text-emerald hover:underline">
          {contact.phone}
        </a>
      ) : null,
    ],
    [
      t("Email"),
      contact.email ? (
        <a href={`mailto:${contact.email}`} className="hover:text-emerald hover:underline">
          {contact.email}
        </a>
      ) : null,
    ],
    [t("Address"), contact.address],
    [t("Notes"), contact.notes],
    // The day the record was added, which can be after trading began.
    [t("Added on"), booksDate(contact.createdAt, locale, { year: "always" })],
  ];

  function exportCsv() {
    const columns = STATEMENT_COLUMNS[side];
    const sign = side === "supplier" ? -1 : 1;
    const head = [t("Date"), t("What"), t("Reference"), t(columns.credit), t("Paid@@statement"), t(columns.balance), t("Voided")];
    const line = (row: { date: string; kind: StatementKind; reference: string | null; amount: number; running: number; cancelled: boolean }) => {
      const credit = row.kind === "sale" || row.kind === "purchase";
      return [row.date.slice(0, 10), t(STATEMENT_KIND_LABEL[row.kind]), row.reference ?? "", credit ? row.amount : "", credit ? "" : row.kind === "received" ? row.amount : -row.amount, sign * row.running, row.cancelled ? t("Voided") : ""];
    };
    const save = (rows: StatementRow[], opening: number, closing: number) =>
      downloadCsv(toCsv(head, [["", t("Opening balance"), "", "", "", sign * opening, ""], ...rows.map(line), [today, t("Closing balance"), "", "", "", sign * closing, ""]]), `${contact.name}-statement-${today}`);

    // An older backend has only the rows on show.
    if (!statement.paging) {
      save(statement.rows, Number(contact.openingBalance), statement.rows.at(-1)?.running ?? Number(contact.openingBalance));
      return;
    }
    startExport(async () => {
      const result = await exportStatementAction(businessId, contact.id).catch(() => ({ ok: false }) as const);
      if (!result.ok) {
        toast.error(t("Couldn't export the statement. Try again."));
        return;
      }
      if (result.capped) toast.info(t("Only the first {count} entries were exported.", { count: formatCount(EXPORT_LIMIT, locale) }));
      save(statementRowsFromApi(result.rows), Number(result.broughtForward), Number(result.closing));
    });
  }

  const paymentButton = (direction: "RECEIVABLE" | "PAYABLE", label: string, variant: "primary" | "secondary") => (
    <Button variant={variant} onClick={() => setOpen({ kind: "payment", direction })}>
      <HandCoins className={variant === "secondary" ? "text-ink-2" : undefined} />
      {t(label)}
    </Button>
  );

  // The debt's age, one side or both: the invoices by due date, and what
  // was owed from before Books on its own.
  const agingSide = (direction: "RECEIVABLE" | "PAYABLE", sideOwed: SideOwed, heading?: string) => {
    const shares = agingShares({ buckets: agingFromInvoices(sideOwed.invoices, today) }, sideOwed.fromBefore);
    const late = shares.filter((share) => share.key === "days31to60" || share.key === "over60").reduce((sum, share) => sum + share.amount, 0);
    return (
      <div key={direction} className="flex flex-col gap-3">
        {heading && <h3 className="text-small font-semibold text-ink-2">{heading}</h3>}
        <AgingBar shares={shares} className="h-3" />
        <AgingLegend shares={shares} currency={currency} />
        {late > 0 && (
          <p className="flex items-start gap-3 rounded-md bg-warning-soft px-4 py-3 text-small leading-relaxed text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{t(direction === "RECEIVABLE" ? "{amount} is more than 30 days late. A friendly reminder usually works best before 60 days." : "{amount} you owe is more than 30 days late.", { amount: formatCurrency(late, currency, locale) })}</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <PageFrame className="gap-6">
      <div className="flex flex-col gap-1">
        <BackLink href="/contacts">{t("All customers & suppliers")}</BackLink>
        <TopbarExtras record={contact.name} />
        <PageHeader
          eyebrow={`${t("Books")} · ${t("Customers & suppliers")}`}
          tone="neutral"
          title={contact.name}
          description={[t(CONTACT_TYPE_WORD[contact.type]), contact.address ?? contact.phone, archived ? t("Archived") : null].filter(Boolean).join(" · ")}
          looseDescription
          actions={
            <>
              <Button variant="secondary" onClick={exportCsv} disabled={statement.rows.length === 0 || exporting} className="print:hidden">
                {exporting ? <Loader /> : <Download className="text-ink-2" />}
                {exporting ? t("Exporting...") : t("Export")}
              </Button>
              {pdfExportOn && (
                <Button variant="secondary" onClick={() => window.print()} disabled={statement.rows.length === 0} className="print:hidden">
                  <Printer className="text-ink-2" />
                  {t("Print")}
                </Button>
              )}
              {canManage && (
                <Button variant="secondary" onClick={() => setOpen({ kind: "edit" })} className="print:hidden">
                  <Pencil className="text-ink-2" />
                  {t("Edit")}
                </Button>
              )}
            </>
          }
        />
      </div>

      {loan && (
        <Banner tone="info" inline icon={<Info />} className="print:hidden">
          {fillNodes(t("{name} is a loan contact: their statement is kept in {loans}, and sales and purchases aren't recorded with them here."), {
            name: contact.name,
            loans: (
              <Link href={`/loan-management/ledger?contactId=${contact.id}`} className="font-semibold underline">
                {t("Loans")}
              </Link>
            ),
          })}
        </Banner>
      )}
      {archived && (
        <Banner tone="neutral" inline icon={<Archive />} className="print:hidden">
          {t("Archived. Their history stays here, but nothing new is recorded with them.")}
        </Banner>
      )}

      <Card padding="none" className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:gap-5">
        <PersonAvatar name={contact.name} src={contact.photoUrl} size={56} coloured />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-small text-ink-muted">{headline}</span>
          <span className={cn("text-display tabular-nums wrap-anywhere", balance > 0 ? "text-income" : balance < 0 ? "text-expense" : "text-ink")}>{formatCurrency(Math.abs(balance), currency, locale)}</span>
          <span className="text-small text-ink-muted">{lastLine}</span>
        </span>
        {/* Nothing new with an archived contact, but whatever they owe again
            (a payment voided after archiving) can still be settled. */}
        {canManage && (!archived || receivableOpen || payableOpen) && (
          <span className="flex flex-wrap items-center gap-3 print:hidden">
            {customer && !loan && !archived && (
              <Button variant="secondary" onClick={() => setOpen({ kind: "sale" })}>
                <ShoppingBag className="text-ink-2" />
                {t("New sale")}
              </Button>
            )}
            {supplier && !loan && !archived && (
              <Button variant="secondary" onClick={() => setOpen({ kind: "purchase" })}>
                <ShoppingCart className="text-ink-2" />
                {t("New purchase")}
              </Button>
            )}
            {/* Owed both ways: a payment each way, since one would settle only its own side. */}
            {receivableOpen && payableOpen ? (
              <>
                {paymentButton("RECEIVABLE", "Record payment received", "primary")}
                {paymentButton("PAYABLE", "Record payment made", "secondary")}
              </>
            ) : receivableOpen || payableOpen ? (
              paymentButton(receivableOpen ? "RECEIVABLE" : "PAYABLE", "Record payment", "primary")
            ) : (
              <>
                <Button disabled aria-describedby="nothing-due">
                  <HandCoins />
                  {t("Record payment")}
                </Button>
                <span id="nothing-due" className="text-small text-ink-muted">
                  {t("Nothing is due right now")}
                </span>
              </>
            )}
          </span>
        )}
      </Card>

      {/* The side cards sit beside the statement only where both have room. */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <StatementTable id={STATEMENT_ID} rows={statement.rows} side={side} currency={currency} today={today} paging={statement.paging} hrefFor={(page) => pageHref(path, searchParams, page)} opening={Number(contact.openingBalance)} truncated={statement.truncated} />
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3">
            <span className="flex flex-col gap-0.5">
              <h2 className="text-h3 text-ink">{t("How old is the money owed?")}</h2>
              <span className="text-small text-ink-muted">{t("Counted from each due date")}</span>
            </span>
            {receivableOpen && payableOpen ? (
              <div className="flex flex-col gap-5">
                {agingSide("RECEIVABLE", owed.receivable, t("They owe you"))}
                {agingSide("PAYABLE", owed.payable, t("You owe them"))}
              </div>
            ) : receivableOpen ? (
              agingSide("RECEIVABLE", owed.receivable)
            ) : payableOpen ? (
              agingSide("PAYABLE", owed.payable)
            ) : (
              <p className="text-small text-ink-muted">{t("Nothing is owed right now.")}</p>
            )}
          </Card>
          <Card className="flex flex-col gap-1">
            <h2 className="text-h3 text-ink">{t("Details")}</h2>
            <div className="flex flex-col">
              {details
                .filter(([, value]) => value)
                .map(([label, value], index) => (
                  <div key={label} className={cn("grid grid-cols-[110px_minmax(0,1fr)] gap-4 py-3 text-body", index > 0 && "border-t border-divider")}>
                    <span className="text-ink-muted">{label}</span>
                    <span className="min-w-0 wrap-break-word text-ink">{value}</span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>

      <ContactDrawer open={open?.kind === "edit"} editing={contact} hasEntries={statement.hasEntries} businessId={businessId} currency={currency} onClose={() => setOpen(null)} onRemoved={() => router.push("/contacts")} />
      <SaleDrawer open={open?.kind === "sale" || open?.kind === "purchase"} kind={open?.kind === "purchase" ? "purchase" : "sale"} contact={contact} businessId={businessId} currency={currency} onClose={() => setOpen(null)} />
      <PaymentDrawer
        open={open?.kind === "payment"}
        direction={open?.kind === "payment" ? open.direction : "RECEIVABLE"}
        contact={contact}
        outstanding={open?.kind === "payment" && open.direction === "PAYABLE" ? detail.payable.transactions : detail.receivable.transactions}
        owedTotal={open?.kind === "payment" && open.direction === "PAYABLE" ? owed.payable.total : owed.receivable.total}
        businessId={businessId}
        currency={currency}
        onClose={() => setOpen(null)}
      />
    </PageFrame>
  );
}
