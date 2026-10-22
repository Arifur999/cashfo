"use client";

import { Download, Pencil, Printer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { accountDisplayName } from "@/lib/customer/accountDisplay";
import type { Account, AccountLedger, AccountSummary, LanguagePreference } from "@/lib/customer/api";
import { ACCOUNT_TYPE_META, booksDate, ledgerFigures, ledgerWords, subtypeLabel } from "@/lib/customer/booksDisplay";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import type { DateRangePreset } from "@/lib/customer/dateRangePresets";
import { ledgerDirection } from "@/lib/customer/ledger";
import { downloadCsv } from "@/lib/download";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { toCsv } from "@/lib/table/csv";
import { pageHref } from "@/lib/table/pageParams";
import { BackLink } from "../shared/BackLink";
import { exportLedgerAction } from "../shared/exportActions";
import { RangePicker, type RangeChange } from "../shared/RangePicker";
import { StatStrip } from "../shared/StatStrip";
import { AccountDrawer } from "./AccountDrawer";
import { LedgerTable } from "./LedgerTable";

interface AccountDetailPageClientProps {
  businessId: string;
  // As the chart holds it, sub-accounts included.
  account: Account;
  // Every account in the workspace, for the edit drawer's parent list.
  accounts: Account[];
  ledger: AccountLedger;
  summary: AccountSummary;
  canManage: boolean;
  preferredLanguage: LanguagePreference;
  currency: string;
  today: string;
  range: DateRangePreset;
  customFrom?: string;
  customTo?: string;
  // The days the range resolved to; both empty for all time.
  dateFrom?: string;
  dateTo?: string;
}

const LEDGER_ID = "account-ledger";

// What an export holds at most (exportActions.ts stops there too).
const EXPORT_LIMIT = 5000;

// Books › Accounts › one account: its opening and closing balance for the
// period, what came in and went out (or, off the wallets, what raised and
// lowered it) between them, and every entry.
export function AccountDetailPageClient({ businessId, account, accounts, ledger, summary, canManage, preferredLanguage, currency, today, range, customFrom, customTo, dateFrom, dateTo }: AccountDetailPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pdfExportOn = useFeature("pdf_export");
  const [editing, setEditing] = useState(false);
  // A new period is loading: the figures and rows on show are the old ones.
  const [loading, startLoading] = useTransition();
  const [exporting, startExport] = useTransition();
  const meta = ACCOUNT_TYPE_META[account.accountType];
  const name = accountDisplayName(account, preferredLanguage);
  const kind = subtypeLabel(account.accountSubtype);
  const words = ledgerWords(account);
  const figures = ledgerFigures(ledger, account.accountType, summary);
  const adjustment = Number(summary.adjustment);
  const path = `/accounts/${account.id}`;

  function update(next: RangeChange) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    for (const [key, value] of Object.entries({ range: next.range, dateFrom: next.dateFrom, dateTo: next.dateTo })) {
      if (value) params.set(key, value);
      else if (key in next) params.delete(key);
    }
    startLoading(() => router.push(`${path}?${params.toString()}`));
  }

  function exportCsv() {
    startExport(async () => {
      const result = await exportLedgerAction(businessId, account.id, dateFrom, dateTo).catch(() => ({ ok: false }) as const);
      if (!result.ok) {
        toast.error(t("Couldn't export the ledger. Try again."));
        return;
      }
      if (result.capped) toast.info(t("Only the first {count} entries were exported.", { count: formatCount(EXPORT_LIMIT, locale) }));
      const rows = result.rows.map((row) => {
        const into = ledgerDirection(row.entryType, account.accountType) === "in";
        return [row.date.slice(0, 10), row.description ?? "", row.referenceNo ?? "", into ? Number(row.amount) : "", into ? "" : Number(row.amount), Number(row.runningBalance)];
      });
      downloadCsv(
        toCsv([t("Date"), t("Description"), t("Reference"), t(words.in), t(words.out), t("Balance")], [[dateFrom ?? "", t("Opening balance"), "", "", "", Number(result.broughtForward)], ...rows, [dateTo ?? today, t("Closing balance"), "", "", "", Number(result.closing)]]),
        `${account.accountNumber ?? "account"}-${name}-${dateFrom ?? "all"}`,
      );
    });
  }

  // "Opening, 1 Oct": the day the figure stands on, when the period has one.
  const dayLabel = (key: string, date: string | undefined, fallback: string) => (date ? t(key, { date: booksDate(date, locale, { today }) }) : t(fallback));
  // What the strip's four figures leave out: transfers between wallets, and
  // a void whose reversal fell in another period.
  const closingNote = [adjustment !== 0 ? t("{amount} transfers", { amount: formatSignedCurrency(adjustment, currency, locale) }) : null, figures.voided !== 0 ? t("{amount} voided or reversed", { amount: formatSignedCurrency(figures.voided, currency, locale) }) : null].filter(Boolean).join(" · ");

  return (
    <PageFrame className="gap-6">
      <div className="flex flex-col gap-1">
        <BackLink href="/accounts">{t("All accounts")}</BackLink>
        <TopbarExtras record={name} />
        <PageHeader
          eyebrow={`${t("Books")} · ${t("Accounts")}`}
          tone="neutral"
          title={name}
          description={[t(meta.singular), account.accountNumber ? t("Code {code}", { code: account.accountNumber }) : null, kind ? t(kind) : null, account.status === "ARCHIVED" ? t("Archived") : null].filter(Boolean).join(" · ")}
          looseDescription
          actions={
            <>
              <Button variant="secondary" onClick={exportCsv} disabled={ledger.meta.total === 0 || exporting} className="print:hidden">
                {exporting ? <Loader /> : <Download className="text-ink-2" />}
                {exporting ? t("Exporting...") : t("Export")}
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

      <RangePicker value={range} from={dateFrom} to={dateTo} customFrom={customFrom} customTo={customTo} busy={loading} onChange={update} />

      <StatStrip
        busy={loading}
        stats={[
          { label: dayLabel("Opening, {date}", dateFrom, "Opening balance"), value: formatCurrency(figures.opening, currency, locale) },
          { label: t(words.in), value: formatSignedCurrency(summary.totalIn, currency, locale), tone: words.money ? "income" : "neutral" },
          { label: t(words.out), value: formatSignedCurrency(-Number(summary.totalOut), currency, locale), tone: words.money ? "expense" : "neutral" },
          { label: dayLabel("Closing, {date}", dateTo, "Closing balance"), value: formatCurrency(figures.closing, currency, locale), note: closingNote || undefined },
        ]}
      />

      <LedgerTable id={LEDGER_ID} account={account} ledger={ledger} figures={figures} summary={summary} currency={currency} today={today} from={dateFrom} to={dateTo} hrefFor={(page) => pageHref(path, searchParams, page)} busy={loading} />

      <AccountDrawer open={editing} editing={account} accounts={accounts} businessId={businessId} preferredLanguage={preferredLanguage} currency={currency} onClose={() => setEditing(false)} onRemoved={() => router.push("/accounts")} />
    </PageFrame>
  );
}
