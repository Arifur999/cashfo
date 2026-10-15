import { ArrowLeft, Receipt } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createElement } from "react";
import { VoidTransactionButton } from "@/components/modules/Customer/Transactions/VoidTransactionButton";
import AmountText from "@/components/smartly/AmountText";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import PageFrame from "@/components/smartly/PageFrame";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { getBudgetCategoryNames } from "@/lib/customer/budgets";
import { categoryTone, NEUTRAL_CATEGORY_TONE } from "@/lib/customer/categoryTone";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDateTime } from "@/lib/customer/date";
import { TRANSACTION_TYPE_LABELS } from "@/lib/customer/transactionDisplay";
import { categoryIndex, describeTransaction } from "@/lib/customer/transactionRows";
import { getTransaction } from "@/lib/customer/transactions";
import { getTranslator } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const ACCOUNT_KIND: Record<string, string> = {
  ASSET: "Wallet",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  INCOME: "Income category",
  EXPENSE: "Expense category",
};

// One transaction: what it was, where the money went, and -- folded away
// for a personal workspace -- how the books recorded it.
export default async function TransactionDetailPage({ params }: PageProps<"/transactions/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const { t } = await getTranslator();
  const [transaction, incomeCategories, expenseCategories] = await Promise.all([
    getTransaction(activeBusinessId, id),
    getBudgetCategoryNames(activeBusinessId, "INCOME"),
    getBudgetCategoryNames(activeBusinessId, "EXPENSE"),
  ]);
  if (!transaction) notFound();

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const row = describeTransaction(transaction, categoryIndex([...incomeCategories, ...expenseCategories]));
  const title = row.title ?? t(TRANSACTION_TYPE_LABELS[transaction.transactionType]);
  const tone = transaction.transactionType === "TRANSFER" ? NEUTRAL_CATEGORY_TONE : categoryTone(row.category?.color);
  const typeTone = transaction.transactionType === "INCOME" ? "income" : transaction.transactionType === "EXPENSE" ? "expense" : "neutral";
  const debitTotal = transaction.entries.filter((e) => e.entryType === "DEBIT").reduce((sum, e) => sum + Number(e.amount), 0);
  const isBusiness = activeBusiness?.type === "BUSINESS";

  type Fact = { label: string; value: React.ReactNode };
  const candidates: (Fact | null)[] = [
    row.category
      ? {
          label: t("Category"),
          value: (
            <span className="inline-flex items-center gap-2 rounded-full bg-cream px-3 py-1 text-caption font-semibold text-ink-2">
              <span className={cn("size-[7px] rounded-full bg-current", tone.fg)} aria-hidden="true" />
              {row.category.name}
            </span>
          ),
        }
      : null,
    { label: t(transaction.transactionType === "INCOME" ? "Paid into" : transaction.transactionType === "EXPENSE" ? "Paid from" : "Between"), value: row.wallet ?? "—" },
    transaction.description ? { label: t("Note"), value: transaction.description } : null,
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
              {transaction.voidedReason}
              {transaction.reversalOfId && (
                <Link href={`/transactions/${transaction.reversalOfId}`} className="font-semibold text-emerald hover:underline">
                  {t("See the original")}
                </Link>
              )}
            </span>
          ),
        }
      : null,
  ];
  const facts = candidates.filter((fact): fact is Fact => fact !== null);

  return (
    <PageFrame className="gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <Link href="/transactions" className="mb-1 inline-flex items-center gap-2 text-small font-semibold text-emerald hover:text-emerald-hover">
            <ArrowLeft className="size-[15px]" aria-hidden="true" />
            {t("Transactions")}
          </Link>
          <h1 className="text-h1 text-ink">{t("Transaction")}</h1>
        </div>
        {canManage && transaction.voidable && !row.cancelled && (
          <div className="flex shrink-0 items-center gap-3">
            <VoidTransactionButton businessId={activeBusinessId} transactionId={transaction.id} title={title} />
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
                  <span className="text-small text-ink-muted">{formatDateTime(transaction.transactionDate)}</span>
                </span>
                <span className={cn("text-h2 text-ink", row.cancelled && "line-through")}>{title}</span>
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
                <div key={fact.label} className={cn("grid gap-4 py-3 text-body sm:grid-cols-[140px_minmax(0,1fr)]", index > 0 && "border-t border-surface-sunken")}>
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
                  <h3 className="text-h3 text-ink">{t("Behind the scenes")}</h3>
                  <span className="text-small text-ink-muted">{t("How Smartly records this in your books. Debits always equal credits.")}</span>
                </span>
                <span className="text-small font-semibold text-emerald group-open:hidden">{t("Show")}</span>
                <span className="hidden text-small font-semibold text-emerald group-open:inline">{t("Hide")}</span>
              </summary>
              <div className="grid grid-cols-[minmax(0,1fr)_120px_120px] items-center gap-x-4 border-t border-line bg-cream px-5 py-3 text-caption font-semibold text-ink-muted">
                <span>{t("Account")}</span>
                <span className="text-right">{t("Debit")}</span>
                <span className="text-right">{t("Credit")}</span>
              </div>
              {transaction.entries.map((entry) => (
                <div key={entry.id} className="grid min-h-13 grid-cols-[minmax(0,1fr)_120px_120px] items-center gap-x-4 border-t border-surface-sunken px-5 py-2 text-body">
                  <span className="flex min-w-0 flex-col">
                    <b className="truncate font-semibold text-ink">{entry.account?.name ?? entry.accountId}</b>
                    <span className="text-caption font-normal text-ink-muted">{t(ACCOUNT_KIND[entry.account?.accountType ?? ""] ?? "Account")}</span>
                  </span>
                  <span className="text-right text-body font-bold text-ink tabular-nums">{entry.entryType === "DEBIT" ? formatCurrency(entry.amount, currency) : <span className="font-normal text-ink-muted">—</span>}</span>
                  <span className="text-right text-body font-bold text-ink tabular-nums">{entry.entryType === "CREDIT" ? formatCurrency(entry.amount, currency) : <span className="font-normal text-ink-muted">—</span>}</span>
                </div>
              ))}
              <div className="grid grid-cols-[minmax(0,1fr)_120px_120px] items-center gap-x-4 border-t border-line bg-cream px-5 py-3 text-small font-semibold text-ink">
                <span>{t("Total")}</span>
                <span className="text-right tabular-nums">{formatCurrency(debitTotal, currency)}</span>
                <span className="text-right tabular-nums">{formatCurrency(debitTotal, currency)}</span>
              </div>
            </details>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-2">
            <h3 className="text-h3 text-ink">{t("History")}</h3>
            <HistoryRow tone="bg-emerald" title={t("Added")} when={formatDateTime(transaction.createdAt)} />
            {transaction.voidedAt && <HistoryRow tone="bg-expense-fill" title={`${t("Voided")}${transaction.voidedReason ? ` · ${transaction.voidedReason}` : ""}`} when={formatDateTime(transaction.voidedAt)} />}
          </Card>
          {canManage && transaction.voidable && !row.cancelled && (
            <Card className="flex flex-col gap-3">
              <h3 className="text-h3 text-ink">{t("Made a mistake?")}</h3>
              <p className="text-body leading-[21px] text-ink-2">{t("Void it and add the right one. Voiding keeps this record in your history, crossed out, so the books still add up.")}</p>
            </Card>
          )}
        </div>
      </div>
    </PageFrame>
  );
}

function HistoryRow({ tone, title, when }: { tone: string; title: string; when: string }) {
  return (
    <div className="flex gap-3 py-3">
      <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", tone)} aria-hidden="true" />
      <span className="flex flex-col">
        <span className="text-body font-semibold text-ink">{title}</span>
        <span className="text-caption font-normal text-ink-muted">{when}</span>
      </span>
    </div>
  );
}
