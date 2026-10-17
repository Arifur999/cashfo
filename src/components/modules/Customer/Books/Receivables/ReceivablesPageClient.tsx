"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { AgingReport, DueSoonRow, OverdueRow } from "@/lib/customer/api";
import { lateByContact } from "@/lib/customer/booksDisplay";
import { downloadCsv } from "@/lib/download";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { toCsv } from "@/lib/table/csv";
import { PaymentDrawer } from "../Contacts/PaymentDrawer";
import { DirectionCard } from "./DirectionCard";
import { DueSoonCard, type DueSoonItem } from "./DueSoonCard";

interface ReceivablesPageClientProps {
  businessId: string;
  receivableAging: AgingReport;
  payableAging: AgingReport;
  receivableOverdue: OverdueRow[];
  payableOverdue: OverdueRow[];
  receivableDueSoon: DueSoonRow[];
  payableDueSoon: DueSoonRow[];
  canManage: boolean;
  currency: string;
  today: string;
}

// Books › Receivables and payables: what customers still owe and what is
// still owed to suppliers, by age, and what falls due this week.
export function ReceivablesPageClient({ businessId, receivableAging, payableAging, receivableOverdue, payableOverdue, receivableDueSoon, payableDueSoon, canManage, currency, today }: ReceivablesPageClientProps) {
  const { t } = useLocale();
  const [paying, setPaying] = useState<DueSoonItem | null>(null);
  const dueSoon: DueSoonItem[] = [...receivableDueSoon.map((row) => ({ ...row, direction: "RECEIVABLE" as const })), ...payableDueSoon.map((row) => ({ ...row, direction: "PAYABLE" as const }))].sort((a, b) => a.daysUntilDue - b.daysUntilDue || a.contactName.localeCompare(b.contactName));

  function exportCsv() {
    const rows = [...lateByContact(receivableOverdue).map((row) => [row.contactName, t("Owes you"), row.oldestDescription ?? "", row.oldestDueDate.slice(0, 10), row.daysLate, row.amount]), ...lateByContact(payableOverdue).map((row) => [row.contactName, t("You owe"), row.oldestDescription ?? "", row.oldestDueDate.slice(0, 10), row.daysLate, row.amount])];
    downloadCsv(toCsv([t("Who"), t("Direction"), t("Oldest"), t("Due"), t("Days late"), t("Amount")], rows), `overdue-${today}`);
  }

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={t("Books")}
        tone="neutral"
        title={t("Receivables and payables")}
        description={t("Money customers still owe the business, and money the business still owes suppliers, by age.")}
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={receivableOverdue.length === 0 && payableOverdue.length === 0}>
            <Download className="text-ink-2" />
            {t("Export")}
          </Button>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <DirectionCard direction="RECEIVABLE" aging={receivableAging} overdue={receivableOverdue} currency={currency} />
        <DirectionCard direction="PAYABLE" aging={payableAging} overdue={payableOverdue} currency={currency} />
      </div>
      <DueSoonCard items={dueSoon} currency={currency} canManage={canManage} onPay={setPaying} />
      {paying && <PaymentDrawer open direction="PAYABLE" contact={{ id: paying.contactId, name: paying.contactName }} businessId={businessId} currency={currency} onClose={() => setPaying(null)} />}
    </PageFrame>
  );
}
