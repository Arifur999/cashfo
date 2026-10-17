"use client";

import { Download, Info, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { AgingReport, Contact } from "@/lib/customer/api";
import { contactsCsvRows, contactStats, overdueOver30 } from "@/lib/customer/booksDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { downloadCsv } from "@/lib/download";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { toCsv } from "@/lib/table/csv";
import { StatStrip } from "../shared/StatStrip";
import { ContactDrawer } from "./ContactDrawer";
import { ContactsTable } from "./ContactsTable";

interface ContactsPageClientProps {
  businessId: string;
  contacts: Contact[];
  receivableAging: AgingReport;
  canManage: boolean;
  currency: string;
  today: string;
}

// Books › Customers and suppliers: what is owed each way, then everyone the
// business trades with.
export function ContactsPageClient({ businessId, contacts, receivableAging, canManage, currency, today }: ContactsPageClientProps) {
  const { t } = useLocale();
  const [drawer, setDrawer] = useState<{ open: boolean; editing: Contact | null }>({ open: false, editing: null });
  const stats = contactStats(contacts);
  const late = overdueOver30(receivableAging);
  const people = (n: number, one: string, many: string) => `${n} ${t(n === 1 ? one : many)}`;

  function exportCsv() {
    downloadCsv(toCsv([t("Name"), t("Type"), t("Phone"), t("Email"), t("They owe you (negative: you owe them)")], contactsCsvRows(contacts)), `customers-and-suppliers-${today}`);
  }

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={t("Books")}
        tone="neutral"
        title={t("Customers and suppliers")}
        description={t("Who buys from the business and who it buys from, with what is still due.")}
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} disabled={contacts.length === 0}>
              <Download className="text-ink-2" />
              {t("Export")}
            </Button>
            {canManage && (
              <Button onClick={() => setDrawer({ open: true, editing: null })}>
                <Plus strokeWidth={2.25} />
                {t("Add person or shop")}
              </Button>
            )}
          </>
        }
      />

      <StatStrip
        stats={[
          { label: t("Customers owe you"), value: formatCurrency(stats.receivable, currency), tone: "income", note: people(stats.receivableFrom, "customer", "customers") },
          { label: t("You owe suppliers"), value: formatCurrency(stats.payable, currency), tone: "expense", note: people(stats.payableTo, "supplier", "suppliers") },
          {
            label: t("Overdue over 30 days"),
            value: formatCurrency(late.amount, currency),
            tone: late.amount > 0 ? "warning" : "neutral",
            note: (
              <>
                {people(late.contacts, "customer", "customers")} ·{" "}
                <Link href="/dena-pawna" className="font-semibold text-emerald hover:underline">
                  {t("see Receivables")}
                </Link>
              </>
            ),
          },
          { label: t("People and shops"), value: stats.total, note: `${people(stats.customers, "customer", "customers")} · ${people(stats.suppliers, "supplier", "suppliers")}` },
        ]}
      />

      <ContactsTable contacts={contacts} currency={currency} canManage={canManage} onAdd={() => setDrawer({ open: true, editing: null })} onEdit={(contact) => setDrawer({ open: true, editing: contact })} />

      <p className="flex items-start gap-3 rounded-md bg-cream px-4 py-3 text-small leading-relaxed text-ink-2">
        <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <span>
          {t("Loans with friends, family, banks and NGOs stay in")}{" "}
          <Link href="/loan-management/dashboard" className="font-semibold text-ink hover:underline">
            {t("Loans")}
          </Link>
          . {t("This list is only for the people and shops this business trades with.")}
        </span>
      </p>

      <ContactDrawer open={drawer.open} editing={drawer.editing} businessId={businessId} currency={currency} onClose={() => setDrawer((current) => ({ ...current, open: false }))} />
    </PageFrame>
  );
}
