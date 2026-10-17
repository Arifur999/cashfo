"use client";

import { Download, Pencil, Printer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { accountDisplayName } from "@/lib/customer/accountDisplay";
import type { Account, AccountLedger, AccountSummary, LanguagePreference } from "@/lib/customer/api";
import { ACCOUNT_TYPE_META, subtypeLabel } from "@/lib/customer/booksDisplay";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import type { DateRangePreset } from "@/lib/customer/dateRangePresets";
import { ledgerDirection } from "@/lib/customer/ledger";
import { downloadCsv } from "@/lib/download";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { toCsv } from "@/lib/table/csv";
import { BackLink } from "../shared/BackLink";
import { RangePicker, type RangeChange } from "../shared/RangePicker";
import { StatStrip } from "../shared/StatStrip";
import { AccountDrawer } from "./AccountDrawer";
import { LedgerTable } from "./LedgerTable";

interface AccountDetailPageClientProps {
  businessId: string;
  account: Account;
  // Every account in the workspace, for the edit drawer's parent list.
  accounts: Account[];
  ledger: AccountLedger;
  summary: AccountSummary;
  canManage: boolean;
  preferredLanguage: LanguagePreference;
  currency: string;
  range: DateRangePreset;
  customFrom?: string;
  customTo?: string;
  // The days the range resolved to; both empty for all time.
  dateFrom?: string;
  dateTo?: string;
}

// Books › Accounts › one account: its opening and closing balance for the
// period, the money in and out between them, and every entry.
export function AccountDetailPageClient({ businessId, account, accounts, ledger, summary, canManage, preferredLanguage, currency, range, customFrom, customTo, dateFrom, dateTo }: AccountDetailPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pdfExportOn = useFeature("pdf_export");
  const [editing, setEditing] = useState(false);
  const meta = ACCOUNT_TYPE_META[account.accountType];
  const name = accountDisplayName(account, preferredLanguage);
  const kind = subtypeLabel(account.accountSubtype);

  function update(next: RangeChange & { page?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    for (const [key, value] of Object.entries({ range: next.range, dateFrom: next.dateFrom, dateTo: next.dateTo, page: next.page })) {
      if (value) params.set(key, value);
      else if (key in next) params.delete(key);
    }
    router.push(`/accounts/${account.id}?${params.toString()}`);
  }

  function exportCsv() {
    const rows = ledger.entries.map((row) => {
      const direction = ledgerDirection(row.entryType, account.accountType);
      return [row.date.slice(0, 10), row.description ?? "", row.referenceNo ?? "", direction === "in" ? Number(row.amount) : "", direction === "out" ? Number(row.amount) : "", Number(row.runningBalance)];
    });
    downloadCsv(toCsv([t("Date"), t("Description"), t("Reference"), t("Money in"), t("Money out"), t("Balance")], [[dateFrom ?? "", t("Opening balance"), "", "", "", Number(ledger.balanceBroughtForward)], ...rows]), `${account.accountNumber ?? "account"}-${name}-${dateFrom ?? "all"}`);
  }

  const day = (label: string, date: string | undefined, fallback: string) => (date ? `${label}, ${formatDate(date, "d MMM")}` : fallback);

  return (
    <PageFrame className="gap-6">
      <div className="flex flex-col gap-1">
        <BackLink href="/accounts">{t("All accounts")}</BackLink>
        <PageHeader
          eyebrow={`${t("Books")} › ${t("Accounts")}`}
          tone="neutral"
          title={name}
          description={[t(meta.singular), account.accountNumber ? `${t("code")} ${account.accountNumber}` : null, kind ? t(kind) : null, account.status === "ARCHIVED" ? t("Archived") : null].filter(Boolean).join(" · ")}
          actions={
            <>
              <Button variant="secondary" onClick={exportCsv} disabled={ledger.entries.length === 0} className="print:hidden">
                <Download className="text-ink-2" />
                {t("Export")}
              </Button>
              {pdfExportOn && (
                <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
                  <Printer className="text-ink-2" />
                  {t("Print")}
                </Button>
              )}
              {canManage && (
                <Button variant="secondary" onClick={() => setEditing(true)} className="print:hidden">
                  <Pencil className="text-ink-2" />
                  {t("Edit account")}
                </Button>
              )}
            </>
          }
        />
      </div>

      <RangePicker value={range} from={dateFrom} to={dateTo} customFrom={customFrom} customTo={customTo} onChange={update} />

      <StatStrip
        stats={[
          { label: day(t("Opening"), dateFrom, t("Opening balance")), value: formatCurrency(ledger.balanceBroughtForward, currency) },
          { label: t("Money in"), value: formatSignedCurrency(summary.totalIn, currency), tone: "income" },
          { label: t("Money out"), value: formatSignedCurrency(-Number(summary.totalOut), currency), tone: "expense" },
          { label: day(t("Closing"), dateTo, t("Closing balance")), value: formatCurrency(ledger.closingBalance, currency) },
        ]}
      />

      <LedgerTable account={account} ledger={ledger} summary={summary} currency={currency} from={dateFrom} onPage={(page) => update({ page: String(page) })} />

      <AccountDrawer open={editing} editing={account} accounts={accounts} businessId={businessId} preferredLanguage={preferredLanguage} currency={currency} onClose={() => setEditing(false)} onRemoved={() => router.push("/accounts")} />
    </PageFrame>
  );
}
