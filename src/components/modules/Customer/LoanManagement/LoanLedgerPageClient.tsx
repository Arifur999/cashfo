"use client";

import { ChevronRight, Printer, ScrollText } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { Contact, LoanStatement } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import type { DateRangePreset } from "@/lib/customer/dateRangePresets";
import { DIRECTION_META, foldProfitRuns, LOAN_KIND_LABELS, loanDirection, statementProfit } from "@/lib/customer/loanDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import { ContactPicker } from "./ContactPicker";

interface LoanLedgerPageClientProps {
  contacts: Contact[];
  currency: string;
  range: DateRangePreset;
  selectedContactId: string;
  statement: LoanStatement | null;
  customFrom?: string;
  customTo?: string;
  // The period the statement covers, resolved on the server.
  periodFrom?: string;
  periodTo: string;
}

const PERIODS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this-year", label: "This year" },
  { value: "last-year", label: "Last year" },
  { value: "custom", label: "Custom" },
];

const GRID = "grid-cols-[100px_100px_minmax(0,1fr)_96px_110px_110px_110px_140px]";

// Loan statement: one bank or person, the period, how the balance went
// from opening to closing, and every entry in between with the balance
// carried forward. It loads as soon as someone is picked.
export function LoanLedgerPageClient({ contacts, currency, range, selectedContactId, statement, customFrom, customTo, periodFrom, periodTo }: LoanLedgerPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Folded runs of profit rows the reader opened.
  const [unfolded, setUnfolded] = useState<Set<string>>(new Set());
  // Admin > System > Feature Flags: pdf_export off hides Print / PDF.
  const pdfExportOn = useFeature("pdf_export");

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/loan-management/ledger?${params.toString()}`);
  }

  function setRange(value: DateRangePreset) {
    updateParams(value === "custom" ? { range: value } : { range: value === "all" ? undefined : value, dateFrom: undefined, dateTo: undefined });
  }

  const contact = contacts.find((c) => c.id === selectedContactId);
  const opening = statement ? Number(statement.balanceBroughtForward) : 0;
  const closing = statement ? Number(statement.closingBalance) : 0;
  const received = statement ? statement.rows.reduce((sum, row) => sum + Number(row.credit ?? 0), 0) : 0;
  const paid = statement ? statement.rows.reduce((sum, row) => sum + Number(row.debit ?? 0), 0) : 0;
  const profit = statementProfit(statement?.rows ?? []);
  // A profit row's amount: paid, or received (with a plus).
  const profitCell = (paidAmount: number, receivedAmount: number) =>
    paidAmount ? <span className="text-right text-warning">{formatCurrency(paidAmount, currency)}</span> : receivedAmount ? <span className="text-right text-income">+ {formatCurrency(receivedAmount, currency)}</span> : <span className="text-right text-ink-muted">—</span>;
  const direction = loanDirection(closing);
  const meta = DIRECTION_META[direction];
  // Read the equation from the closing side: for someone you owe, what you
  // took raises it and what you paid back lowers it; for someone who owes
  // you, the other way round.
  const owe = direction === "DENA";
  const quickPicks = [...contacts].filter((c) => c.status === "ACTIVE").sort((a, b) => Math.abs(Number(b.currentBalance)) - Math.abs(Number(a.currentBalance))).slice(0, 8);

  const amountWithSide = (balance: number) => {
    const side = loanDirection(balance);
    return side === "SETTLED" ? formatCurrency(0, currency) : `${formatCurrency(Math.abs(balance), currency)} ${t(DIRECTION_META[side].name)}`;
  };

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={t("Loans")}
        tone="loans"
        title={t("Loan statement")}
        description={t("One bank or person, every entry, with the balance carried forward.")}
        actions={
          pdfExportOn && (
            <Button variant="secondary" onClick={() => window.print()} disabled={!statement} title={statement ? undefined : t("Pick a bank or person first")} className="print:hidden">
              <Printer className="text-ink-2" />
              {t("Print / PDF")}
            </Button>
          )
        }
      />

      <Card padding="none" className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-end print:hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label htmlFor="loan-contact" className="text-small font-medium text-ink-2">
            {t("Bank / person")}
          </label>
          <ContactPicker id="loan-contact" contacts={contacts} value={selectedContactId} onChange={(id) => updateParams({ contactId: id })} currency={currency} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-small font-medium text-ink-2">{t("Period")}</span>
          <SegmentedControl options={PERIODS.map((period) => ({ value: period.value, label: t(period.label) }))} value={range} onChange={setRange} label={t("Period")} size="lg" className="max-md:w-full max-md:overflow-x-auto" />
        </div>
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <Input size="md" type="date" value={customFrom ?? ""} onChange={(event) => updateParams({ dateFrom: event.target.value })} aria-label={t("From")} max={customTo} />
            <span className="text-small text-ink-muted">{t("to")}</span>
            <Input size="md" type="date" value={customTo ?? ""} onChange={(event) => updateParams({ dateTo: event.target.value })} aria-label={t("To@@date")} min={customFrom} />
          </div>
        )}
      </Card>

      {!statement || !contact ? (
        <Card padding="none" className="flex min-h-130 flex-col items-center justify-center gap-3 p-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-lg bg-pillar-loans-soft text-pillar-loans">
            <ScrollText className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-2 text-h3 text-ink">{t("Pick a bank or person to see their statement")}</h2>
          <p className="max-w-115 text-body leading-relaxed text-ink-muted">{t("You'll see the opening balance, every loan and repayment, and the running balance, ready to print.")}</p>
          {quickPicks.length > 0 && (
            <>
              <span className="mt-4 text-caption font-semibold text-ink-muted">{t("People & banks")}</span>
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:w-auto md:grid-cols-4">
                {quickPicks.map((pick) => {
                  const side = DIRECTION_META[loanDirection(pick.currentBalance)];
                  return (
                    <button key={pick.id} type="button" onClick={() => updateParams({ contactId: pick.id })} className="flex h-16 items-center gap-3 rounded-md border border-line bg-surface px-4 text-left shadow-card transition-colors hover:border-line-strong md:w-50">
                      <PersonAvatar name={pick.name} src={pick.photoUrl} kind={pick.type} size={30} />
                      <span className="flex min-w-0 flex-col gap-px">
                        <span className="truncate text-body font-semibold text-ink">{pick.name}</span>
                        <span className={cn("text-caption font-normal tabular-nums", side.text)}>{amountWithSide(Number(pick.currentBalance))}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      ) : (
        <>
          <div className={cn("grid gap-4", (profit.paid > 0 || profit.received > 0) && "md:grid-cols-[minmax(0,1fr)_280px]")}>
          <Card className="grid grid-cols-2 gap-3 md:flex md:items-stretch" aria-label={t("Opening balance, plus what moved one way, minus what moved the other, equals the closing balance")}>
            <EquationCell label={t("Opening")} value={amountWithSide(opening)} />
            <Operator>+</Operator>
            <EquationCell label={owe ? t("Loan taken / got back") : t("Loan given / paid back")} value={formatCurrency(owe ? received : paid, currency)} className={owe ? "text-expense" : "text-income"} />
            <Operator>−</Operator>
            <EquationCell label={owe ? t("Loan given / paid back") : t("Loan taken / got back")} value={formatCurrency(owe ? paid : received, currency)} className="text-ink-muted" />
            <Operator equals>=</Operator>
            <div className={cn("col-span-2 flex flex-col gap-1 rounded-md px-4 py-2 md:-my-2 md:-mr-2.5 md:flex-[1.2]", meta.box)}>
              <span className={cn("text-caption font-semibold", meta.text)}>{direction === "SETTLED" ? t("Settled") : `${t(meta.label)} · ${t(meta.name)}`}</span>
              <span className={cn("text-h2 tabular-nums", meta.text)}>{formatCurrency(Math.abs(closing), currency)}</span>
            </div>
          </Card>
          {(profit.paid > 0 || profit.received > 0) && (
            <div className="flex flex-col justify-center gap-1 rounded-lg border border-warning-fill/40 bg-warning-soft px-5 py-4 text-warning">
              <span className="text-caption font-semibold">
                {profit.paid > 0 ? t(profit.paidMonths === 1 ? "Profit paid · {count} month" : "Profit paid · {count} months", { count: profit.paidMonths }) : t(profit.receivedMonths === 1 ? "Profit received · {count} month" : "Profit received · {count} months", { count: profit.receivedMonths })}
              </span>
              <span className="text-h2 font-bold tabular-nums">{formatCurrency(profit.paid > 0 ? profit.paid : profit.received, currency)}</span>
              <span className="text-caption">{profit.paid > 0 ? t("Counted as expense. Doesn't change what you owe.") : t("Counted as income. Doesn't change what they owe.")}</span>
            </div>
          )}
          </div>

          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-270">
                <div className={cn("grid items-center gap-x-4 border-b border-line bg-table-head px-6 py-3 text-caption text-ink-muted", GRID)}>
                  <span>{t("Date")}</span>
                  <span>{t("Reference")}</span>
                  <span>{t("Description")}</span>
                  <span>{t("Category")}</span>
                  <span className="text-right">{t("Principal in")}</span>
                  <span className="text-right">{t("Principal out")}</span>
                  <span className="text-right">{t("Profit")}</span>
                  <span className="text-right">{t("Balance")}</span>
                </div>
                <div className={cn("grid h-11 items-center gap-x-4 border-b border-surface-sunken bg-table-head px-6 text-body", GRID)}>
                  <span className="col-span-7 font-semibold text-ink-2">
                    {t("Opening balance")}
                    {periodFrom && ` · ${formatDate(periodFrom)}`}
                  </span>
                  <span className={cn("text-right font-semibold tabular-nums", DIRECTION_META[loanDirection(opening)].text)}>{amountWithSide(opening)}</span>
                </div>
                {statement.rows.length === 0 && <p className="px-6 py-10 text-center text-body text-ink-muted">{t("No entries in this period.")}</p>}
                {foldProfitRuns(statement.rows).flatMap((item) => (item.kind === "more" && unfolded.has(item.key) ? item.rows.map((row) => ({ kind: "row" as const, row })) : [item])).map((item) => {
                  if (item.kind === "more") {
                    const first = item.rows[0];
                    const last = item.rows[item.rows.length - 1];
                    const sum = statementProfit(item.rows);
                    return (
                      <button key={item.key} type="button" onClick={() => setUnfolded(new Set([...unfolded, item.key]))} aria-expanded={false} className={cn("grid h-13 w-full items-center gap-x-4 border-b border-surface-sunken bg-cream/60 px-6 text-left text-body text-ink tabular-nums hover:bg-cream", GRID)}>
                        <span className="text-small text-ink-2">
                          {formatDate(first.date, "MMM")} – {formatDate(last.date, "MMM")}
                        </span>
                        <span />
                        <span className="flex min-w-0 items-center gap-2 font-medium text-ink-2">
                          <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">{t(sum.paid > 0 ? "{count} more profit payments" : "{count} more profit received", { count: item.rows.length })}</span>
                        </span>
                        <span>
                          <Chip tone="warning" size="sm" className="font-bold">
                            {t("Profit")}
                          </Chip>
                        </span>
                        <span className="text-right text-ink-muted">—</span>
                        <span className="text-right text-ink-muted">—</span>
                        {profitCell(sum.paid, sum.received)}
                        <span className="text-right text-ink-muted">{formatCurrency(Math.abs(Number(last.runningPrincipal)), currency)}</span>
                      </button>
                    );
                  }
                  const row = item.row;
                  const isProfit = row.category === "Profit";
                  const voided = row.status === "VOIDED";
                  const side = DIRECTION_META[loanDirection(row.runningPrincipal)];
                  return (
                    <Link key={row.transactionId} href={`/transactions/${row.transactionId}`} className={cn("grid h-13 items-center gap-x-4 border-b border-surface-sunken px-6 text-body text-ink tabular-nums transition-colors hover:bg-cream", GRID, voided && "opacity-60")}>
                      <span className="text-small text-ink-2">{formatDate(row.date)}</span>
                      <span className={cn("truncate text-small", row.referenceNo ? "text-ink-2" : "text-ink-muted")}>{row.referenceNo ?? "—"}</span>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={cn("truncate", voided && "line-through")}>{row.description ?? "—"}</span>
                        {voided && (
                          <Chip tone="expense" size="sm" className="font-semibold">
                            {t("Voided")}
                          </Chip>
                        )}
                      </span>
                      <span>
                        <Chip tone={isProfit ? "warning" : "neutral"} size="sm" className="font-bold">
                          {t(isProfit ? "Profit" : "Principal")}
                        </Chip>
                      </span>
                      <span className={cn("text-right", row.credit ? "text-ink" : "text-ink-muted")}>{row.credit ? formatCurrency(row.credit, currency) : "—"}</span>
                      <span className={cn("text-right", row.debit ? "text-ink" : "text-ink-muted")}>{row.debit ? formatCurrency(row.debit, currency) : "—"}</span>
                      {profitCell(Number(row.profitPaid ?? 0), Number(row.profitReceived ?? 0))}
                      {/* Profit leaves the balance where it was. */}
                      <span className={cn("text-right font-semibold", isProfit ? "font-normal text-ink-muted" : side.text)}>{formatCurrency(Math.abs(Number(row.runningPrincipal)), currency)}</span>
                    </Link>
                  );
                })}
                <div className={cn("grid h-13 items-center gap-x-4 bg-table-head px-6 text-body font-semibold tabular-nums", GRID)}>
                  <span className="col-span-4 font-bold text-ink">
                    {t("Closing balance")} · {formatDate(periodTo)}
                  </span>
                  <span className="text-right text-ink">{formatCurrency(received, currency)}</span>
                  <span className={cn("text-right", paid ? "text-ink" : "text-ink-muted")}>{formatCurrency(paid, currency)}</span>
                  {profit.paid || profit.received ? profitCell(profit.paid, profit.received) : <span className="text-right text-ink-muted">{formatCurrency(0, currency)}</span>}
                  <span className={cn("text-right text-title font-bold", meta.text)}>{amountWithSide(closing)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-line px-6 py-3 text-small text-ink-muted">
              <span className="flex items-center gap-2">
                <PersonAvatar name={contact.name} src={contact.photoUrl} kind={contact.type} size={28} />
                {contact.name} · {t(LOAN_KIND_LABELS[contact.type])}
              </span>
              <span>
                {statement.rows.length} {t(statement.rows.length === 1 ? "entry" : "entries")}
              </span>
            </div>
          </Card>
        </>
      )}
    </PageFrame>
  );
}

function EquationCell({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col gap-1 md:flex-1">
      <span className="text-caption font-normal text-ink-muted">{label}</span>
      <span className={cn("text-h2 text-ink tabular-nums", className)}>{value}</span>
    </div>
  );
}

function Operator({ equals = false, children }: { equals?: boolean; children: React.ReactNode }) {
  return (
    <span aria-hidden="true" className={cn("hidden size-6.5 shrink-0 items-center justify-center self-center rounded-full text-body-lg font-semibold md:flex", equals ? "bg-emerald text-white" : "bg-surface-sunken text-ink-2")}>
      {children}
    </span>
  );
}
