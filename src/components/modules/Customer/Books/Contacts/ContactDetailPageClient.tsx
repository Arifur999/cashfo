"use client";

import { AlertTriangle, HandCoins, Pencil, ShoppingBag, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { Contact, ContactBalanceDetail, Transaction } from "@/lib/customer/api";
import { agingFromInvoices, agingShares, CONTACT_TYPE_WORD, isCustomer, isSupplier, lastRow, statementRows } from "@/lib/customer/booksDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AgingBar, AgingLegend } from "../shared/Aging";
import { BackLink } from "../shared/BackLink";
import { ContactDrawer } from "./ContactDrawer";
import { PaymentDrawer } from "./PaymentDrawer";
import { SaleDrawer } from "./SaleDrawer";
import { StatementTable, type StatementSide } from "./StatementTable";

interface ContactDetailPageClientProps {
  businessId: string;
  contact: Contact;
  detail: ContactBalanceDetail;
  // Every posting with this contact, newest first as the API sends them.
  transactions: Transaction[];
  canManage: boolean;
  currency: string;
  today: string;
}

type Open = { kind: "sale" | "purchase" } | { kind: "payment" } | { kind: "edit" } | null;

// Books › one customer or supplier: what they owe (or you owe), every sale
// and payment, how old the debt is, and how to reach them.
export function ContactDetailPageClient({ businessId, contact, detail, transactions, canManage, currency, today }: ContactDetailPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const pdfExportOn = useFeature("pdf_export");
  const [open, setOpen] = useState<Open>(null);

  const customer = isCustomer(contact);
  const supplier = isSupplier(contact);
  const side: StatementSide = customer && supplier ? "both" : supplier ? "supplier" : "customer";
  const balance = Number(contact.currentBalance);
  const rows = statementRows(transactions, detail.openingBalance);
  const lastCredit = lastRow(rows, ["sale", "purchase"]);
  const lastPayment = lastRow(rows, ["received", "paid"]);

  // The debt's age, from whichever side is open; receivable first.
  const owedToYou = Number(detail.receivable.remaining) > 0;
  const invoices = owedToYou ? detail.receivable.transactions : detail.payable.transactions;
  const shares = agingShares({ buckets: agingFromInvoices(invoices, today) });
  const late = shares.filter((share) => share.key === "days31to60" || share.key === "over60").reduce((sum, share) => sum + share.amount, 0);
  const owed = shares.reduce((sum, share) => sum + share.amount, 0);

  const headline = balance > 0 ? `${contact.name} ${t("owes you")}` : balance < 0 ? `${t("You owe")} ${contact.name}` : `${t("Settled with")} ${contact.name}`;
  const lastLine = [lastCredit ? `${t(lastCredit.kind === "sale" ? "Last sale" : "Last purchase")} ${formatDate(lastCredit.date, "EEE, d MMM")}` : t("No sales or purchases yet"), lastPayment ? `${t("last payment")} ${formatDate(lastPayment.date, "EEE, d MMM")}` : null].filter(Boolean).join(" · ");
  const since = t(side === "customer" ? "Customer since" : side === "supplier" ? "Supplier since" : "Trading since");

  const details: [string, React.ReactNode][] = [
    [t("Type"), t(CONTACT_TYPE_WORD[contact.type])],
    [t("Phone"), contact.phone ? <span className="font-mono text-small text-ink-2">{contact.phone}</span> : null],
    [t("Email"), contact.email],
    [t("Address"), contact.address],
    [t("Notes"), contact.notes],
    [since, formatDate(contact.createdAt, "MMMM yyyy")],
  ];

  return (
    <PageFrame className="gap-6">
      <div className="flex flex-col gap-1">
        <BackLink href="/contacts">{t("All customers and suppliers")}</BackLink>
        <PageHeader
          eyebrow={`${t("Books")} › ${t("Customers and suppliers")}`}
          tone="neutral"
          title={contact.name}
          description={[t(CONTACT_TYPE_WORD[contact.type]), contact.address ?? contact.phone, contact.status === "ARCHIVED" ? t("Archived") : null].filter(Boolean).join(" · ")}
          actions={
            canManage && (
              <Button variant="secondary" onClick={() => setOpen({ kind: "edit" })} className="print:hidden">
                <Pencil className="text-ink-2" />
                {t("Edit")}
              </Button>
            )
          }
        />
      </div>

      <Card padding="none" className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:gap-5">
        <PersonAvatar name={contact.name} src={contact.photoUrl} size={56} coloured />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-small text-ink-muted">{headline}</span>
          <span className={cn("text-display tabular-nums", balance > 0 ? "text-income" : balance < 0 ? "text-expense" : "text-ink")}>{formatCurrency(Math.abs(balance), currency)}</span>
          <span className="text-small text-ink-muted">{lastLine}</span>
        </span>
        {canManage && (
          <span className="flex flex-wrap gap-3 print:hidden">
            {customer && (
              <Button variant="secondary" onClick={() => setOpen({ kind: "sale" })}>
                <ShoppingBag className="text-ink-2" />
                {t("New sale")}
              </Button>
            )}
            {supplier && (
              <Button variant="secondary" onClick={() => setOpen({ kind: "purchase" })}>
                <ShoppingCart className="text-ink-2" />
                {t("New purchase")}
              </Button>
            )}
            <Button onClick={() => setOpen({ kind: "payment" })} disabled={balance === 0} title={balance === 0 ? t("Nothing is due") : undefined}>
              <HandCoins />
              {t("Record payment")}
            </Button>
          </span>
        )}
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <StatementTable rows={rows} side={side} currency={currency} onPrint={pdfExportOn ? () => window.print() : undefined} />
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3">
            <span className="flex flex-col gap-0.5">
              <h3 className="text-h3 text-ink">{t("How old is the money owed?")}</h3>
              <span className="text-small text-ink-muted">{t("Counted from each due date")}</span>
            </span>
            {owed > 0 ? (
              <>
                <AgingBar shares={shares} className="h-3" />
                <AgingLegend shares={shares} currency={currency} />
                {late > 0 && (
                  <p className="flex items-start gap-3 rounded-md bg-warning-soft px-4 py-3 text-small leading-relaxed text-warning">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>
                      {formatCurrency(late, currency)} {t("is more than 30 days late. A friendly reminder usually works best before 60 days.")}
                    </span>
                  </p>
                )}
              </>
            ) : (
              <p className="text-small text-ink-muted">{t("Nothing is owed right now.")}</p>
            )}
          </Card>
          <Card className="flex flex-col gap-1">
            <h3 className="text-h3 text-ink">{t("Details")}</h3>
            <div className="flex flex-col">
              {details
                .filter(([, value]) => value)
                .map(([label, value], index) => (
                  <div key={label} className={cn("grid grid-cols-[110px_minmax(0,1fr)] gap-4 py-3 text-body", index > 0 && "border-t border-surface-sunken")}>
                    <span className="text-ink-muted">{label}</span>
                    <span className="min-w-0 break-words text-ink">{value}</span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>

      <ContactDrawer open={open?.kind === "edit"} editing={contact} businessId={businessId} currency={currency} onClose={() => setOpen(null)} onRemoved={() => router.push("/contacts")} />
      <SaleDrawer open={open?.kind === "sale" || open?.kind === "purchase"} kind={open?.kind === "purchase" ? "purchase" : "sale"} contact={contact} businessId={businessId} currency={currency} onClose={() => setOpen(null)} />
      <PaymentDrawer open={open?.kind === "payment"} direction={balance < 0 ? "PAYABLE" : "RECEIVABLE"} contact={contact} outstanding={balance < 0 ? detail.payable.transactions : detail.receivable.transactions} businessId={businessId} currency={currency} onClose={() => setOpen(null)} />
    </PageFrame>
  );
}
