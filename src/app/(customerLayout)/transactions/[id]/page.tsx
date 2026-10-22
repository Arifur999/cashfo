import { Receipt } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createElement } from "react";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import { BackToTransactions } from "@/components/modules/Customer/Transactions/BackToTransactions";
import { EditTransactionButton } from "@/components/modules/Customer/Transactions/EditTransactionButton";
import { VoidTransactionButton } from "@/components/modules/Customer/Transactions/VoidTransactionButton";
import AmountText from "@/components/smartly/AmountText";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { ListCell, ListHead, ListHeadCell, ListRow, ListTotalRow } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import { getMoneyAccounts } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import type { AccountType } from "@/lib/customer/api";
import { getCurrentUser } from "@/lib/customer/auth";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { getBudgetCategoryNames } from "@/lib/customer/budgets";
import { categoryTone, NEUTRAL_CATEGORY_TONE } from "@/lib/customer/categoryTone";
import { formatCurrency } from "@/lib/customer/currency";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { TRANSACTION_TYPE_LABELS, transactionBackLink, transactionPageHref } from "@/lib/customer/transactionDisplay";
import { categoryIndex, categoryLabel, describeTransaction, editableEntry, type OwningFeature, owningFeature, recordTimeLabel, reversalTitle, rowTitle, systemText, transactionDayLabel } from "@/lib/customer/transactionRows";
import { getTransaction } from "@/lib/customer/transactions";
import { toDateInputValue } from "@/lib/date";
import { getTranslator } from "@/lib/i18n/locale";
import { localName } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";

// The list's name, read from nothing: Next runs generateMetadata for every
// <Link> prefetch of this page, without rendering the page, so reading the
// record here cost API calls for each row on screen.
export async function generateMetadata({ params }: PageProps<"/transactions/[id]">) {
  const { id } = await params;
  return customerPageMetadata(`/transactions/${id}`);
}

const ACCOUNT_KIND: Record<string, string> = {
  LIABILITY: "Liability",
  EQUITY: "Equity",
  INCOME: "Income category",
  EXPENSE: "Expense category",
};

// What an account is to the reader. Of the assets only cash, bank and
// mobile money are wallets; a business's receivables, stock and fixed
// assets are assets.
function accountKind(account?: { accountType: AccountType; accountSubtype: string | null }): string {
  if (!account) return "Account";
  if (account.accountType === "ASSET") {
    if (account.accountSubtype === "cash" || account.accountSubtype === "bank" || account.accountSubtype === "mfs") return "Wallet";
    return account.accountSubtype === "savings" ? "Savings wallet" : "Asset";
  }
  return ACCOUNT_KIND[account.accountType] ?? "Account";
}

// Where a feature's own posting can be changed.
const FEATURE_PAGE: Record<OwningFeature, { href: string; label: string }> = {
  asset: { href: "/assets-management/purchase-sell", label: "Open Buy & sell" },
  savings: { href: "/savings-goals/dashboard", label: "Open Savings" },
  referral: { href: "/referrals", label: "Open Invite & earn" },
};

const ENTRY_COLUMNS = "md:grid-cols-[minmax(0,1fr)_120px_120px]";

// One transaction: what it was, where the money went, and -- folded away
// for a personal workspace -- how the books recorded it.
export default async function TransactionDetailPage({ params, searchParams }: PageProps<"/transactions/[id]">) {
  const { id } = await params;
  // Opened from a statement, a loan's payments or an account: the way back
  // goes there, as it was left. Anything else goes back to Transactions.
  const back = transactionBackLink((await searchParams).from);
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const { t, locale } = await getTranslator();
  const [transaction, incomeCategories, expenseCategories, wallets] = await Promise.all([
    getTransaction(activeBusinessId, id),
    getBudgetCategoryNames(activeBusinessId, "INCOME"),
    getBudgetCategoryNames(activeBusinessId, "EXPENSE"),
    getMoneyAccounts(activeBusinessId),
  ]);
  if (!transaction) notFound();

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  // Wallets by the name the reader sees ("নগদ" for Cash in Bangla).
  const lang = displayLanguage(locale);
  const accountNames = Object.fromEntries(wallets.map((wallet) => [wallet.id, accountDisplayName(wallet, lang)]));
  const row = describeTransaction(transaction, categoryIndex([...incomeCategories, ...expenseCategories]), accountNames, locale);
  const title = rowTitle(row, t);
  const note = transaction.reversalOfId ? reversalTitle(transaction.description) : transaction.description;
  const tone = transaction.transactionType === "TRANSFER" ? NEUTRAL_CATEGORY_TONE : categoryTone(row.category?.color);
  const typeTone = transaction.transactionType === "INCOME" ? "income" : transaction.transactionType === "EXPENSE" ? "expense" : "neutral";
  const debitTotal = transaction.entries.filter((e) => e.entryType === "DEBIT").reduce((sum, e) => sum + Number(e.amount), 0);
  const isBusiness = activeBusiness?.type === "BUSINESS";
  // A plain income, expense or transfer can be edited (decision D2); other
  // voidable entries can only be voided. Edit goes by the entry's own
  // category, never an account standing in for one.
  const editable = canManage && !row.cancelled ? editableEntry(transaction, title, row.entryCategory) : null;
  // Standing, but kept by the feature that made it (an asset sale, a
  // savings goal, a referral payout): it can only change there.
  const owned = canManage && !transaction.voidable && !row.cancelled;
  const feature = owned ? owningFeature(transaction) : null;

  type Fact = { label: string; value: React.ReactNode };
  const candidates: (Fact | null)[] = [
    row.category
      ? {
          label: t("Category"),
          value: (
            <span className="inline-flex items-center gap-2 rounded-full bg-surface-sunken px-3 py-1 text-caption font-semibold text-ink-2">
              <span className={cn("size-1.75 rounded-full bg-current", tone.fg)} aria-hidden="true" />
              {categoryLabel(row.category.name, t)}
            </span>
          ),
        }
      : null,
    { label: t(transaction.transactionType === "INCOME" ? "Paid into" : transaction.transactionType === "EXPENSE" ? "Paid from" : "Between"), value: row.wallet ?? "—" },
    // A reversal's own note is "Reversal of: <what it undid>"; the Status row
    // already says Reversal and links the original, so the note shows only
    // what it undid, and nothing when that was just the original's id.
    note ? { label: t("Note"), value: systemText(note, t) } : null,
    transaction.referenceNo ? { label: t("Reference"), value: <span className="font-mono text-code text-ink-2">{transaction.referenceNo}</span> } : null,
    transaction.contact ? { label: t("Contact"), value: transaction.contact.name } : null,
    row.cancelled
      ? {
          label: t("Status"),
          value: (
            <span>
              <Chip tone="expense" className="mr-2 font-semibold">
                {t(row.cancelled)}
              </Chip>
              {transaction.voidedReason === "Corrected" ? t("Corrected") : transaction.voidedReason}
              {transaction.reversalOfId && (
                <Link href={transactionPageHref(transaction.reversalOfId, back)} className="font-semibold text-emerald hover:underline">
                  {t("See the original")}
                </Link>
              )}
            </span>
          ),
        }
      : null,
  ];
  const facts = candidates.filter((fact): fact is Fact => fact !== null);
  const amountCell = (side: "DEBIT" | "CREDIT", entry: (typeof transaction.entries)[number]) =>
    entry.entryType === side ? (
      <>
        {/* A phone stacks the entry: its one figure says which side it is on. */}
        <span className="block text-caption font-normal text-ink-muted md:hidden">{t(side === "DEBIT" ? "Debit" : "Credit")}</span>
        {formatCurrency(entry.amount, currency, locale)}
      </>
    ) : (
      <span className="font-normal text-ink-muted">—</span>
    );

  return (
    <PageFrame className="gap-6">
      <TopbarExtras record={title} />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <BackToTransactions label={t(back?.label ?? "Transactions")} href={back?.href} />
          {/* What the page is; the entry's own name below is its heading. */}
          <p className="text-h1 text-ink">{t("Transaction")}</p>
        </div>
        {canManage && transaction.voidable && !row.cancelled && (
          <div className="flex shrink-0 items-center gap-3">
            <VoidTransactionButton businessId={activeBusinessId} transactionId={transaction.id} title={title} />
            {editable && <EditTransactionButton businessId={activeBusinessId} currency={currency} entry={editable} />}
          </div>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <Card padding="none" className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-5 p-6">
              <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-lg [&_svg]:size-6.5", tone.bg, tone.fg)}>
                {createElement(row.category?.icon ? budgetCategoryIcon(row.category.icon) : Receipt, { "aria-hidden": true })}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <Chip tone={typeTone === "income" ? "income" : typeTone === "expense" ? "expense" : "neutral"} className="font-semibold">
                    {t(TRANSACTION_TYPE_LABELS[transaction.transactionType])}
                  </Chip>
                  {/* A transaction's date is a day; it has no time of its own. */}
                  <span className="text-small text-ink-muted">{transactionDayLabel(toDateInputValue(transaction.transactionDate), locale)}</span>
                </span>
                <h1 className={cn("text-h2 text-ink", row.cancelled && "line-through")}>{title}</h1>
              </div>
              <AmountText
                value={row.signedAmount}
                currency={currency}
                signed={transaction.transactionType !== "TRANSFER"}
                tone={row.cancelled ? "neutral" : typeTone === "neutral" ? "neutral" : "auto"}
                size="display"
                className={cn(row.cancelled && "text-ink-muted line-through")}
              />
            </div>
            <dl className="flex flex-col px-6 pb-3">
              {facts.map((fact, index) => (
                <div key={fact.label} className={cn("grid gap-4 py-3 text-body sm:grid-cols-[140px_minmax(0,1fr)]", index > 0 && "border-t border-divider")}>
                  <dt className="text-ink-muted">{fact.label}</dt>
                  <dd className="min-w-0 text-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card padding="none" className="overflow-hidden">
            <details open={isBusiness} className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <h2 className="text-h3 text-ink">{t("Behind the scenes")}</h2>
                  <span className="text-small text-ink-muted">{t("How Smartly records this in your books. Debits always equal credits.")}</span>
                </span>
                <span className="text-small font-semibold text-emerald group-open:hidden">{t("Show")}</span>
                <span className="hidden text-small font-semibold text-emerald group-open:inline">{t("Hide")}</span>
              </summary>
              <div role="table" aria-label={t("Behind the scenes")} className="border-t border-line">
                <ListHead columns={ENTRY_COLUMNS}>
                  <ListHeadCell>{t("Account")}</ListHeadCell>
                  <ListHeadCell align="end">{t("Debit")}</ListHeadCell>
                  <ListHeadCell align="end">{t("Credit")}</ListHeadCell>
                </ListHead>
                {transaction.entries.map((entry) => (
                  <ListRow key={entry.id} columns={ENTRY_COLUMNS} density="dense">
                    <ListCell className="flex min-w-0 flex-col">
                      <b className="truncate font-semibold text-ink">{accountNames[entry.accountId] ?? (entry.account ? localName(locale, entry.account) : entry.accountId)}</b>
                      <span className="text-caption font-normal text-ink-muted">{t(accountKind(entry.account))}</span>
                    </ListCell>
                    <ListCell align="end" className={cn("font-bold tabular-nums", entry.entryType !== "DEBIT" && "max-md:hidden")}>
                      {amountCell("DEBIT", entry)}
                    </ListCell>
                    <ListCell align="end" className={cn("font-bold tabular-nums", entry.entryType !== "CREDIT" && "max-md:hidden")}>
                      {amountCell("CREDIT", entry)}
                    </ListCell>
                  </ListRow>
                ))}
                <ListTotalRow columns={ENTRY_COLUMNS}>
                  <ListCell>{t("Total")}</ListCell>
                  <ListCell align="end" className="tabular-nums">
                    <span className="block text-caption font-normal text-ink-muted md:hidden">{t("Debit and credit")}</span>
                    {formatCurrency(debitTotal, currency, locale)}
                  </ListCell>
                  <ListCell align="end" className="tabular-nums max-md:hidden">
                    {formatCurrency(debitTotal, currency, locale)}
                  </ListCell>
                </ListTotalRow>
              </div>
            </details>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-2">
            <h2 className="text-h3 text-ink">{t("History")}</h2>
            {transaction.correctedFrom ? (
              <HistoryRow
                tone="bg-info"
                title={t("Corrected from {amount}", { amount: formatCurrency(Number(transaction.correctedFrom.amount), currency, locale) })}
                when={recordTimeLabel(transaction.createdAt, locale, t)}
                link={{ href: transactionPageHref(transaction.correctedFrom.id, back), label: t("See the original") }}
              />
            ) : (
              <HistoryRow tone="bg-emerald" title={t("Added")} when={recordTimeLabel(transaction.createdAt, locale, t)} />
            )}
            {transaction.voidedAt && (
              <HistoryRow
                tone="bg-expense-fill"
                title={`${t("Voided")}${transaction.voidedReason ? ` · ${transaction.voidedReason === "Corrected" ? t("Corrected") : transaction.voidedReason}` : ""}`}
                when={recordTimeLabel(transaction.voidedAt, locale, t)}
                link={transaction.correctedBy ? { href: transactionPageHref(transaction.correctedBy.id, back), label: t("See the corrected entry ({amount})", { amount: formatCurrency(Number(transaction.correctedBy.amount), currency, locale) }) } : undefined}
              />
            )}
          </Card>
          {canManage && transaction.voidable && !row.cancelled && (
            <Card className="flex flex-col gap-3">
              <h2 className="text-h3 text-ink">{t("Made a mistake?")}</h2>
              {editable ? (
                <>
                  <p className="text-body text-ink-2">{t("Use Edit to fix the amount, category, wallet, date or note. The original is kept in History, marked as corrected, so your records stay honest.")}</p>
                  <p className="text-body text-ink-2">{t("Void removes it from your balances when it should never have been added.")}</p>
                </>
              ) : (
                <p className="text-body text-ink-2">{t("Void it and add the right one. Voiding keeps this record in your history, crossed out, so the books still add up.")}</p>
              )}
            </Card>
          )}
          {owned && (
            <Card className="flex flex-col gap-3">
              <h2 className="text-h3 text-ink">{t("Made a mistake?")}</h2>
              <p className="text-body text-ink-2">{t("This entry belongs to another feature (an asset sale, a savings goal or a referral payout). Change it there.")}</p>
              {feature && (
                <Link href={FEATURE_PAGE[feature].href} className="self-start text-body font-semibold text-emerald hover:underline">
                  {t(FEATURE_PAGE[feature].label)}
                </Link>
              )}
            </Card>
          )}
        </div>
      </div>
    </PageFrame>
  );
}

function HistoryRow({ tone, title, when, link }: { tone: string; title: string; when: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex gap-3 py-3">
      <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", tone)} aria-hidden="true" />
      <span className="flex flex-col">
        <span className="text-body font-semibold text-ink">{title}</span>
        <span className="text-caption font-normal text-ink-muted">{when}</span>
        {link && (
          <Link href={link.href} className="mt-1 text-small font-semibold text-emerald hover:underline">
            {link.label}
          </Link>
        )}
      </span>
    </div>
  );
}
