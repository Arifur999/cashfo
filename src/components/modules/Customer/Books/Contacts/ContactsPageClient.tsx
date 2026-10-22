"use client";

import { Download, Info, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { AgingReport, Contact } from "@/lib/customer/api";
import { contactsCsvRows, contactStats, overdueOver30 } from "@/lib/customer/booksDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { downloadCsv } from "@/lib/download";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { toCsv } from "@/lib/table/csv";
import { StatStrip } from "../shared/StatStrip";
import { ContactDrawer } from "./ContactDrawer";
import { ContactsTable } from "./ContactsTable";

interface ContactsPageClientProps {
  businessId: string;
  contacts: Contact[];
  // Books' own customers only; Loans' contacts are left out.
  receivableAging: AgingReport;
  canManage: boolean;
  currency: string;
  today: string;
}

// Books › Customers & suppliers: what is owed each way, then everyone the
// business trades with.
export function ContactsPageClient({ businessId, contacts, receivableAging, canManage, currency, today }: ContactsPageClientProps) {
  const { t, locale } = useLocale();
  const loansOn = useFeature("loan_management");
  const [drawer, setDrawer] = useState<{ open: boolean; editing: Contact | null }>({ open: false, editing: null });
  const stats = contactStats(contacts);
  const late = overdueOver30(receivableAging);
  // "{count} customers", the count in the reader's digits.
  const counted = (n: number, one: string, many: string) => t(n === 1 ? one : many, { count: formatCount(n, locale) });

  function exportCsv() {
    downloadCsv(toCsv([t("Name"), t("Type"), t("Phone"), t("Email"), t("They owe you (negative: you owe them)")], contactsCsvRows(contacts, t)), `customers-and-suppliers-${today}`);
  }

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={t("Books")}
        tone="neutral"
        title={t("Customers & suppliers")}
        description={t("Who buys from the business and who it buys from, with what is still due.")}
        looseDescription
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

      {/* Counted by which way the money goes, not by type: an overpaid
          customer is someone you owe. */}
      <StatStrip
        stats={[
          { label: t("Owed to you"), value: formatCurrency(stats.receivable, currency), tone: "income", note: counted(stats.receivableFrom, "{count} person", "{count} people") },
          { label: t("You owe"), value: formatCurrency(stats.payable, currency), tone: "expense", note: counted(stats.payableTo, "{count} person", "{count} people") },
          {
            label: t("Overdue over 30 days"),
            value: formatCurrency(late.amount, currency),
            tone: late.amount > 0 ? "warning" : "neutral",
            note: (
              <>
                {/* On a phone the link takes its own line, with no dot left hanging. */}
                {counted(late.contacts, "{count} customer", "{count} customers")}
                <span aria-hidden="true" className="max-sm:hidden">
                  {" · "}
                </span>
                <Link href="/dena-pawna" className="-my-1 inline-flex py-1 font-semibold max-sm:mt-0 max-sm:flex max-sm:w-fit text-emerald hover:underline pointer-coarse:py-3">
                  {t("See receivables & payables")}
                </Link>
              </>
            ),
          },
          { label: t("People and shops"), value: formatCount(stats.total, locale), note: `${counted(stats.customers, "{count} customer", "{count} customers")} · ${counted(stats.suppliers, "{count} supplier", "{count} suppliers")}` },
        ]}
      />

      <ContactsTable contacts={contacts} currency={currency} canManage={canManage} today={today} onAdd={() => setDrawer({ open: true, editing: null })} onEdit={(contact) => setDrawer({ open: true, editing: contact })} />

      {loansOn && (
        <p className="flex items-start gap-3 rounded-md bg-strip px-4 py-3 text-small leading-relaxed text-ink-2">
          <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <span>
            {fillNodes(t("Loans with friends, family, banks and NGOs stay in {loans}. This list is only for the people and shops this business trades with."), {
              loans: (
                <Link href="/loan-management/dashboard" className="font-semibold text-ink hover:underline">
                  {t("Loans")}
                </Link>
              ),
            })}
          </span>
        </p>
      )}

      {/* lastActivityAt is set once anything is posted with them; Remove then archives. */}
      <ContactDrawer open={drawer.open} editing={drawer.editing} hasEntries={drawer.editing ? drawer.editing.lastActivityAt !== null : undefined} businessId={businessId} currency={currency} onClose={() => setDrawer((current) => ({ ...current, open: false }))} />
    </PageFrame>
  );
}
