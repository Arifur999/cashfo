"use client";

import { Download, Plus } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { AccountGroup, LanguagePreference, MonthlyBreakdown } from "@/lib/customer/api";
import { accountsCsvRows, booksBalance, flattenAccounts, hasAccountCodes } from "@/lib/customer/booksDisplay";
import { formatDate } from "@/lib/customer/date";
import { downloadCsv } from "@/lib/download";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { toCsv } from "@/lib/table/csv";
import { AccountDrawer } from "./AccountDrawer";
import { AccountsTable } from "./AccountsTable";
import { BooksBalanceCard } from "./BooksBalanceCard";
import { YearSummaryCard } from "./YearSummaryCard";

interface AccountsPageClientProps {
  businessId: string;
  businessName: string;
  groups: AccountGroup[];
  // This year's income and expenses by category, 1 January to today.
  income: MonthlyBreakdown;
  expense: MonthlyBreakdown;
  today: string;
  canManage: boolean;
  preferredLanguage: LanguagePreference;
  currency: string;
}

// Books › Accounts: whether the books balance, every account by group, and
// what came in and went out this year.
export function AccountsPageClient({ businessId, businessName, groups, income, expense, today, canManage, preferredLanguage, currency }: AccountsPageClientProps) {
  const { t } = useLocale();
  const [adding, setAdding] = useState(false);
  const accounts = groups.flatMap((group) => flattenAccounts(group.accounts).map(({ account }) => account));
  const since = `${t("1 Jan to")} ${formatDate(today, "d MMM yyyy")}`;

  function exportCsv() {
    downloadCsv(toCsv([t("Code"), t("Account"), t("Type"), t("Kind"), t("Balance")], accountsCsvRows(groups)), `accounts-${today}`);
  }

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={t("Books")}
        tone="neutral"
        title={t("Accounts")}
        description={`${t("Every account in")} ${businessName}, ${t("grouped the way an accountant would read them.")}`}
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} disabled={accounts.length === 0}>
              <Download className="text-ink-2" />
              {t("Export")}
            </Button>
            {canManage && (
              <Button onClick={() => setAdding(true)}>
                <Plus strokeWidth={2.25} />
                {t("Add account")}
              </Button>
            )}
          </>
        }
      />

      <BooksBalanceCard balance={booksBalance(groups)} currency={currency} />
      <AccountsTable groups={groups} preferredLanguage={preferredLanguage} currency={currency} hasCodes={hasAccountCodes(groups)} />
      <div className="grid gap-4 lg:grid-cols-2">
        <YearSummaryCard title={t("Income this year")} description={since} breakdown={income} currency={currency} />
        <YearSummaryCard title={t("Expenses this year")} description={since} breakdown={expense} currency={currency} />
      </div>

      <AccountDrawer open={adding} editing={null} accounts={accounts} businessId={businessId} preferredLanguage={preferredLanguage} currency={currency} onClose={() => setAdding(false)} />
    </PageFrame>
  );
}
