"use client";

import { ArrowLeft, Download, Printer, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PrintPreview } from "../Balance/PrintPreview";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { SavingsGoal, SavingsStatement } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { getSavingsStatementAction } from "@/lib/customer/savingsGoalActions";
import { LOOK_META } from "@/lib/customer/savingsDisplay";
import { goalLook } from "@/lib/customer/savingsPlan";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface GoalStatementDialogProps {
  open: boolean;
  onClose: () => void;
  // Back to the goal's details.
  onBack: () => void;
  businessId: string;
  goal: SavingsGoal | null;
  currency: string;
  person: { name: string; email: string };
  // The print preview is open: the page hides itself from the printout.
  onPrinting?: (on: boolean) => void;
}

// Characters the PDF's fonts can draw (Latin-1 and the usual quotes and
// dashes); Bangla isn't among them.
const DRAWABLE = /^[ -~ -ÿ–—‘’“”•…€]*$/;

// A goal's full statement (design: SavingsDashboard's statement page): the
// period and the goal, opening, money in, money out and the balance, every
// entry with where it came from and went and the running balance, where the
// money came from altogether and where it is now. Print opens the board's
// A4 print preview;
// Download PDF gets the server's PDF, which can't draw Bangla names.
export function GoalStatementDialog({ open, onClose, onBack, businessId, goal, currency, person, onPrinting }: GoalStatementDialogProps) {
  const { t, fmt } = useLocale();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const day = (value: string) => formatDate(value, "d MMM yyyy", fmt);
  const [load, setLoad] = useState<{ goalId: string; data: SavingsStatement | null; failed: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Print opens the board's A4 preview over the app; the page behind it is
  // left out of the printout (onPrinting).
  const [previewing, setPreviewing] = useState(false);
  const preview = (on: boolean) => {
    setPreviewing(on);
    onPrinting?.(on);
  };

  const goalId = open && goal ? goal.id : null;
  useEffect(() => {
    if (!goalId) return;
    let cancelled = false;
    getSavingsStatementAction(businessId, goalId)
      .then((result) => !cancelled && setLoad({ goalId, data: result.success ? (result.data ?? null) : null, failed: !result.success }))
      .catch(() => !cancelled && setLoad({ goalId, data: null, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [goalId, businessId, attempt]);

  if (!goal) return null;
  const statement = load?.goalId === goal.id ? load.data : null;
  const failed = load?.goalId === goal.id && load.failed;

  const rowText = (row: SavingsStatement["rows"][number]) => {
    const note = row.notes ? ` · ${row.notes}` : "";
    switch (row.kind) {
      case "ALREADY_SAVED":
        return { what: t("Already saved when goal was made"), from: t("Already saved"), to: row.to ?? "–" };
      case "ADDED":
        return { what: `${t("Money added")}${note}`, from: row.from ?? "–", to: row.to ?? "–" };
      case "PROFIT":
        // From: the income category it counts under.
        return { what: `${t("Profit from the bank")}${note}`, from: t("{name} (income)", { name: row.from ? t(row.from) : t("Bank profit") }), to: row.to ?? "–" };
      case "MOVED_IN":
        return { what: `${t("Moved in from another goal")}${note}`, from: t("{name} (goal)", { name: row.from ?? "" }), to: goal.name };
      case "MOVED_OUT":
        return { what: `${t("Moved out to another goal")}${note}`, from: goal.name, to: t("{name} (goal)", { name: row.to ?? "" }) };
      case "ACCOUNT_CHANGED":
        // The money changed savings account; the balance stays the same.
        return { what: `${t("Moved to another savings account")}${row.moved ? ` · ${money(row.moved)}` : ""}${note}`, from: row.from ?? "–", to: row.to ?? "–" };
      default:
        return { what: `${t("Withdrawn to main balance")}${note}`, from: row.from ?? "–", to: row.to ?? "–" };
    }
  };

  const view = statement && (() => {
    const firstDay = [statement.goal.startDate, ...statement.rows.map((row) => row.date.slice(0, 10))].sort()[0];
    const rows = statement.rows.map((row, index) => ({ n: formatCount(index + 1, fmt), date: day(row.date), ...rowText(row), moneyIn: row.moneyIn ? money(row.moneyIn) : "", moneyOut: row.moneyOut ? money(row.moneyOut) : "", balance: money(row.balance) }));
    const sources = statement.sources.map((source) => ({
      label: source.kind === "ALREADY_SAVED" ? t("Already saved") : source.kind === "PROFIT" ? t("Profit · {name}", { name: source.name ? t(source.name) : t("Bank profit") }) : source.kind === "GOAL" ? t("Moved in from {name}", { name: source.name ?? "" }) : (source.name ?? "–"),
      value: money(source.amount),
    }));
    const now = statement.now.map((item) => ({ label: item.name ?? t("Savings account"), value: money(item.amount) }));
    const info = [
      { label: t("Goal"), value: goal.name },
      { label: t("Target"), value: money(goal.targetAmount) },
      { label: t("End date"), value: day(goal.targetDate) },
      { label: t("Status"), value: t(LOOK_META[goalLook(goal)].label) },
    ];
    const sums = [
      { label: t("Opening balance"), value: money(statement.totals.opening), tone: "bg-surface-sunken text-ink" },
      { label: t("Money in"), value: money(statement.totals.moneyIn), tone: "bg-success-soft text-tint-green-ink" },
      { label: t("Money out"), value: money(statement.totals.moneyOut), tone: "bg-expense-soft text-expense" },
      { label: t("Current balance"), value: money(statement.totals.balance), tone: "bg-mint-50 text-brand-ink" },
    ];
    // Every name the PDF would print (it leaves out a Bangla person name by itself).
    const names = [goal.name, ...statement.rows.flatMap((row) => [row.from ?? "", row.to ?? "", row.notes ?? ""]), ...statement.sources.map((s) => s.name ?? ""), ...statement.now.map((n) => n.name ?? "")];
    return { firstDay, rows, sources, now, info, sums, drawable: names.every((name) => DRAWABLE.test(name)) };
  })();

  // The board's page count for an A4 print: 14 rows on the first page, 32
  // on each after.
  const pages = view ? (view.rows.length <= 14 ? 1 : 1 + Math.ceil((view.rows.length - 14) / 32)) : 1;

  const head = "px-1.5 py-2 text-left font-semibold";
  const cell = "border-b border-divider px-1.5 py-2 align-top";
  const sheet = view && statement && (
    <>
      <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-ink pb-4.5">
        <div className="flex flex-col gap-1">
          <span className="text-small font-bold tracking-[0.06em] text-emerald uppercase">Smartly</span>
          <span className="text-[22px] font-bold">{t("Savings goal statement")}</span>
          <span className="text-small text-ink-soft">{[person.name, person.email].filter(Boolean).join(" · ")}</span>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-3.5 gap-y-1 text-right text-[12.5px]">
          <dt className="text-ink-muted">{t("Statement date")}</dt>
          <dd className="font-bold">{day(statement.today)}</dd>
          <dt className="text-ink-muted">{t("Period")}</dt>
          <dd className="font-bold">{`${day(view.firstDay)} – ${day(statement.today)}`}</dd>
          <dt className="text-ink-muted">{t("Entries")}</dt>
          <dd className="font-bold">{formatCount(view.rows.length, fmt)}</dd>
        </dl>
      </header>
      <div className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-line md:grid-cols-4">
        {view.info.map((item) => (
          <div key={item.label} className="flex flex-col gap-0.75 border-r border-b border-line px-3.5 py-3 md:border-b-0">
            <span className="text-[11.5px] text-ink-muted">{item.label}</span>
            <span className="text-body font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {view.sums.map((item) => (
          <div key={item.label} className={cn("flex flex-col gap-1 rounded-[10px] px-3.5 py-3", item.tone)}>
            <span className="text-[11.5px] text-ink-soft">{item.label}</span>
            <span className="text-[18px] font-bold tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
      <section className="flex flex-col gap-2">
        <h3 className="text-body font-bold">{t("Transactions")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-170 border-collapse text-[12.5px] tabular-nums">
            <thead className="border-b-[1.5px] border-ink text-ink-soft">
              <tr>
                <th className={cn(head, "w-7")}>#</th>
                <th className={cn(head, "w-24")}>{t("Date")}</th>
                <th className={head}>{t("Details")}</th>
                <th className={head}>{t("From")}</th>
                <th className={head}>{t("To")}</th>
                <th className={cn(head, "text-right")}>{t("In")}</th>
                <th className={cn(head, "text-right")}>{t("Out")}</th>
                <th className={cn(head, "text-right")}>{t("Balance")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-ink-soft">
                <td className={cell} />
                <td className={cell}>{day(view.firstDay)}</td>
                <td className={cell}>{t("Goal started")}</td>
                <td className={cell}>–</td>
                <td className={cell}>–</td>
                <td className={cell} />
                <td className={cell} />
                <td className={cn(cell, "text-right font-semibold")}>{money(0)}</td>
              </tr>
              {view.rows.map((row) => (
                <tr key={row.n}>
                  <td className={cn(cell, "text-ink-faint")}>{row.n}</td>
                  <td className={cell}>{row.date}</td>
                  <td className={cn(cell, "font-medium")}>{row.what}</td>
                  <td className={cell}>{row.from}</td>
                  <td className={cell}>{row.to}</td>
                  <td className={cn(cell, "text-right font-semibold text-tint-green-ink")}>{row.moneyIn}</td>
                  <td className={cn(cell, "text-right font-semibold text-expense")}>{row.moneyOut}</td>
                  <td className={cn(cell, "text-right font-semibold")}>{row.balance}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-[1.5px] border-ink font-bold">
              <tr>
                <td colSpan={5} className="px-1.5 py-2.5">
                  {t("Total")}
                </td>
                <td className="px-1.5 py-2.5 text-right text-tint-green-ink">{money(statement.totals.moneyIn)}</td>
                <td className="px-1.5 py-2.5 text-right text-expense">{money(statement.totals.moneyOut)}</td>
                <td className="px-1.5 py-2.5 text-right">{money(statement.totals.balance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {view.rows.length === 0 && <p className="py-3.5 text-small text-ink-muted">{t("No money has moved for this goal yet.")}</p>}
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Box title={t("Money came from")} items={view.sources} totalLabel={t("Total in")} total={money(statement.totals.moneyIn)} empty={t("Nothing came in yet.")} />
        <Box title={t("Where it is now")} items={view.now} totalLabel={t("Current balance")} total={money(statement.totals.balance)} empty={t("Nothing is left in savings accounts.")} />
      </section>
      <footer className="border-t border-line pt-3.5 text-[11.5px] leading-normal text-ink-muted">
        {t("Generated by Smartly on {date}. Goal transfers move money between goals only; the savings account balance stays the same. Withdrawals go to a main balance account.", { date: day(statement.today) })}
      </footer>
    </>
  );

  return (
    <>
      {previewing &&
        sheet &&
        createPortal(
          <PrintPreview look="bar" subtitle={t(pages === 1 ? "A4 · Portrait · {count} page · Margins 12 mm, colours kept" : "A4 · Portrait · {count} pages · Margins 12 mm, colours kept", { count: formatCount(pages, fmt) })} onClose={() => preview(false)}>
            <section className="flex flex-col gap-5.5">{sheet}</section>
          </PrintPreview>,
          document.body,
        )}
      <Dialog open={open && !previewing} onOpenChange={(next) => !next && onClose()}>
        <DialogContent showCloseButton={false} className="flex max-h-[calc(100dvh-32px)] w-235 max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 leading-[normal] text-ink shadow-overlay ring-0 sm:max-w-[calc(100vw-32px)]">
          <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-b border-line px-5 py-3.5">
            <Button variant="secondary" onClick={onBack} className="text-[13.5px]">
              <ArrowLeft className="size-3.75" strokeWidth={2.25} />
              {t("Back")}
            </Button>
            <DialogTitle className="min-w-0 flex-1 truncate text-[16px] font-semibold text-ink">{t("Statement · {name}", { name: goal.name })}</DialogTitle>
            <DialogDescription className="sr-only">{t("Savings goal statement")}</DialogDescription>
            <Button variant="secondary" onClick={() => preview(true)} disabled={!view} aria-haspopup="dialog" className="text-[13.5px]">
              <Printer className="size-3.75" />
              {t("Print")}
            </Button>
            {view?.drawable !== false && (
              <Button asChild className={cn("text-[13.5px]", !view && "pointer-events-none opacity-50")}>
                <a href={`/api/savings-statement/${goal.id}`} download aria-disabled={!view}>
                  <Download className="size-3.75" strokeWidth={2.25} />
                  {t("Download PDF")}
                </a>
              </Button>
            )}
            <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          {view && !view.drawable && <p className="shrink-0 border-b border-line bg-strip px-5 py-2 text-caption text-ink-2">{t("The PDF can't show Bangla names yet. Use Print and pick Save as PDF to keep a copy.")}</p>}
          <div className="min-h-0 flex-1 overflow-y-auto bg-page p-3 md:p-5">
            {!statement ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                {failed ? (
                  <>
                    <p role="alert" className="text-small text-ink-muted">
                      {t("Couldn't load this goal's history.")}
                    </p>
                    <Button variant="secondary" size="sm" onClick={() => setAttempt((count) => count + 1)}>
                      <RefreshCw aria-hidden="true" />
                      {t("Try again")}
                    </Button>
                  </>
                ) : (
                  <Loader size={22} label={t("Loading...")} />
                )}
              </div>
            ) : (
              view && (
                <article className="flex flex-col gap-5.5 rounded-[10px] border border-line bg-surface px-4 py-6 text-ink md:px-9 md:py-8">{sheet}</article>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Box({ title, items, totalLabel, total, empty }: { title: string; items: { label: string; value: string }[]; totalLabel: string; total: string; empty: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[10px] border border-line px-4 py-3.5 text-[12.5px] tabular-nums">
      <h3 className="mb-1 text-small font-bold">{title}</h3>
      {items.length === 0 && <span className="text-ink-muted">{empty}</span>}
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex justify-between gap-3">
          <span className="min-w-0 truncate text-ink-2">{item.label}</span>
          <b>{item.value}</b>
        </div>
      ))}
      <div className="flex justify-between gap-3 border-t border-line pt-1.5 font-bold">
        <span>{totalLabel}</span>
        <span>{total}</span>
      </div>
    </div>
  );
}
