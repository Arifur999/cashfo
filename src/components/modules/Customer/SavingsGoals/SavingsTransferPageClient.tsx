"use client";

import { ArrowLeftRight, ArrowRight, ArrowUpDown, PiggyBank } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import Pagination from "@/components/smartly/Pagination";
import { usePageParam } from "@/hooks/usePageParam";
import type { SavingsGoal, SavingsTransferRow } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { createSavingsTransferAction } from "@/lib/customer/savingsGoalActions";
import { savingsError } from "@/lib/customer/savingsDisplay";
import { getAppToday } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { paginate } from "@/lib/table/paginate";
import { cn } from "@/lib/utils";
import { GoalPicker } from "./GoalPicker";

interface SavingsTransferPageClientProps {
  businessId: string;
  goals: SavingsGoal[];
  transfers: SavingsTransferRow[];
  currency: string;
  canManage: boolean;
}

// Date | From → To | Amount from md up; phones stack the goals and the
// amount on one line with the date under them.
const COLUMNS = "md:grid-cols-[100px_minmax(0,1fr)_120px]";
const PAGE_SIZE = 25;

// Move between goals: the form to make the next move, then the history of
// every one. Only which goal the money counts toward changes. Side by side
// from xl only: at tablet and small-laptop widths a fixed form column left
// the goal names no room at all.
export function SavingsTransferPageClient({ businessId, goals, transfers, currency, canManage }: SavingsTransferPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const listId = useId();
  const { page, setPage } = usePageParam();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  // A withdrawn goal was paid out and is closed: it can't take money and
  // has none to give.
  const open = goals.filter((goal) => goal.status !== "WITHDRAWN");
  const funded = open.filter((goal) => Number(goal.currentAmount) > 0);
  const from = open.find((goal) => goal.id === fromId);
  const to = open.find((goal) => goal.id === toId);
  const value = Number(amount) || 0;
  const fromSaved = from ? Number(from.currentAmount) : 0;
  const over = !!from && value > fromSaved;
  const valid = !!from && !!to && from.id !== to.id && value > 0 && !over;
  // The header counts every move, not just the page on show.
  const total = transfers.reduce((sum, transfer) => sum + Number(transfer.amount), 0);
  const shown = paginate(transfers, page, PAGE_SIZE);
  const toAfter = to ? Math.min(100, Math.round(((Number(to.currentAmount) + value) / Number(to.targetAmount)) * 100)) : 0;

  function swap() {
    setFromId(toId);
    setToId(fromId);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      // The backend settles both goals' status: the one taking the money can
      // reach its target, and a Completed one giving it away below its target
      // is opened again.
      const result = await createSavingsTransferAction(businessId, { fromGoalId: fromId, toGoalId: toId, amount: value, date: getAppToday(), notes: note.trim() || undefined });
      if (!result.success) {
        toast.error(savingsError(result.message, "Failed to move", t, currency));
        return;
      }
      toast.success(t("Moved"));
      setAmount("");
      setNote("");
      // The new move is the newest: show the page it is on.
      setPage(1);
      router.refresh();
    });
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-4 md:px-6 md:py-5">
      <h2 className="text-title text-ink">{t("History")}</h2>
      {transfers.length > 0 && (
        <span className="text-small text-ink-muted tabular-nums">
          {t(transfers.length === 1 ? "{count} move" : "{count} moves", { count: formatCount(transfers.length, locale) })} · {formatCurrency(total, currency)}
        </span>
      )}
    </div>
  );

  const history = (
    <ListCard
      id={listId}
      label={t("History")}
      header={header}
      className={cn(canManage && "xl:col-start-1 xl:row-start-1")}
      footer={
        // One page needs no pager: the header already counts the moves.
        shown.totalPages > 1 && (
          <ListFooter>
            <Pagination page={shown.page} totalPages={shown.totalPages} total={shown.total} pageSize={PAGE_SIZE} onPageChange={setPage} focusTargetId={listId} />
          </ListFooter>
        )
      }
    >
      {transfers.length === 0 ? (
        <ListEmpty tone="info" icon={<ArrowLeftRight />} title={t("Nothing moved yet")} description={t("Shift money from one goal to another and it shows up here.")} />
      ) : (
        <>
          <ListHead columns={COLUMNS}>
            <ListHeadCell>{t("Date")}</ListHeadCell>
            <ListHeadCell>{t("From → To")}</ListHeadCell>
            <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
          </ListHead>
          {shown.rows.map((transfer) => (
            <ListRow key={transfer.id} columns={COLUMNS} density="relaxed">
              <ListCell className="text-caption text-ink-2 max-md:col-start-1 max-md:row-start-2 md:text-body">{formatDate(transfer.date, undefined, locale)}</ListCell>
              <ListCell className="flex flex-col gap-0.75 max-md:col-start-1 max-md:row-start-1">
                {/* Read as a sentence; the arrow means nothing out loud. */}
                <span className="sr-only">{t("From {from} to {to}", { from: transfer.fromGoalName, to: transfer.toGoalName })}</span>
                <span aria-hidden="true" className="flex min-w-0 items-center gap-2 font-medium text-ink">
                  <span className="truncate">{transfer.fromGoalName}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-ink-faint" />
                  <span className="truncate">{transfer.toGoalName}</span>
                </span>
                {transfer.notes && <span className="truncate text-caption font-normal text-ink-muted">{transfer.notes}</span>}
              </ListCell>
              <ListCell align="end" className="font-semibold text-info tabular-nums max-md:col-start-2 max-md:row-start-1">
                {formatCurrency(transfer.amount, currency)}
              </ListCell>
            </ListRow>
          ))}
        </>
      )}
    </ListCard>
  );

  if (!canManage) {
    return (
      <PageFrame className="gap-6">
        <PageHeader eyebrow={`${t("Money")} · ${t("Savings")}`} title={t("Move between goals")} description={t("Shift saved money from one goal to another. Only which goal it counts toward changes.")} />
        {history}
      </PageFrame>
    );
  }

  // Nothing to move from or to: say why and where to go, instead of a form
  // whose every field is disabled.
  const blocked = open.length < 2 ? [t("You need at least two goals to move money between them.")] : funded.length === 0 ? [t("No goal has money saved yet."), t("Add money to a goal first, then you can move it to another.")] : null;

  return (
    <PageFrame className="gap-6">
      <PageHeader eyebrow={`${t("Money")} · ${t("Savings")}`} title={t("Move between goals")} description={t("Shift saved money from one goal to another. Only which goal it counts toward changes.")} />

      {/* The form comes first, so phones and tablets reach the page's one
          action before the history; from xl it sits on the right. */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <Card asChild className="flex flex-col gap-4 xl:col-start-2 xl:row-start-1">
          {blocked ? (
            <section aria-labelledby="st-title">
              <h2 id="st-title" className="text-title text-ink">
                {t("New move")}
              </h2>
              <span className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-mint-50 text-emerald">
                  <PiggyBank className="size-4.5" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  {blocked.map((line, index) => (
                    <p key={line} className={cn("text-small", index === 0 ? "font-semibold text-ink" : "text-ink-muted")}>
                      {line}
                    </p>
                  ))}
                </span>
              </span>
              <Button variant="secondary" asChild className="self-start pointer-coarse:h-11">
                <Link href="/savings-goals/dashboard">{t("Go to Savings goals")}</Link>
              </Button>
            </section>
          ) : (
            <form onSubmit={submit} aria-labelledby="st-title">
              <h2 id="st-title" className="text-title text-ink">
                {t("New move")}
              </h2>
              <div className="flex flex-col gap-2">
                <label id="st-from-label" htmlFor="st-from" className="text-small font-medium text-ink-2">
                  {t("From goal")}
                </label>
                {/* Only goals with money, never the one already in To. */}
                <GoalPicker id="st-from" labelId="st-from-label" goals={goals} options={funded.filter((goal) => goal.id !== toId)} value={fromId} onChange={setFromId} currency={currency} />
              </div>
              <div className="-my-3.5 flex justify-center">
                <button
                  type="button"
                  onClick={swap}
                  disabled={!fromId || !toId}
                  aria-label={t("Swap From and To")}
                  title={t("Swap")}
                  className="relative z-10 flex size-8 items-center justify-center rounded-full border border-line-strong bg-surface text-ink-2 shadow-[0_2px_6px_rgba(14,26,22,0.08)] hover:bg-surface-sunken disabled:opacity-60 pointer-coarse:size-11"
                >
                  <ArrowUpDown className="size-3.5" aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <label id="st-to-label" htmlFor="st-to" className="text-small font-medium text-ink-2">
                  {t("To goal")}
                </label>
                <GoalPicker id="st-to" labelId="st-to-label" goals={goals} options={open.filter((goal) => goal.id !== fromId)} value={toId} onChange={setToId} currency={currency} />
              </div>
              <Field
                htmlFor="st-amount"
                label={<span className="text-small font-medium text-ink-2">{t("Amount")}</span>}
                error={over && from ? t("Only {amount} is saved in {goal}", { amount: formatCurrency(fromSaved, currency), goal: from.name }) : undefined}
                hint={
                  from && to && value > 0
                    ? t("{goal} goes to {percent}% · {from} keeps {amount}", { goal: to.name, percent: formatCount(toAfter, locale), from: from.name, amount: formatCurrency(Math.max(0, fromSaved - value), currency) })
                    : from
                      ? t("Up to {amount} available in {wallet}", { amount: formatCurrency(fromSaved, currency), wallet: from.name })
                      : undefined
                }
              >
                {/* Read out with the hint (what is there, what the move leaves);
                    when too much is typed, the error replaces it and the input
                    points at that instead. */}
                <AmountInput id="st-amount" value={amount} onChange={setAmount} currency={currency} invalid={over} describedBy={from && !over ? "st-amount-hint" : undefined} />
              </Field>
              <Field
                htmlFor="st-note"
                label={
                  <span className="text-small font-medium text-ink-2">
                    {t("Note")} <span className="font-normal text-ink-muted">({t("optional")})</span>
                  </span>
                }
              >
                <Input id="st-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("e.g. Hajj comes first")} className="px-0" frameClassName="px-3" />
              </Field>
              <Button type="submit" variant="action" size="lg" disabled={!valid || isPending} className="w-full">
                {isPending && <Loader size={16} onDark label={t("Loading...")} />}
                {value > 0 ? t("Move {amount}", { amount: formatCurrency(value, currency) }) : t("Move")}
              </Button>
            </form>
          )}
        </Card>

        {history}
      </div>
    </PageFrame>
  );
}
