"use client";

import { ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUpDown, PiggyBank, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import DayInput from "@/components/smartly/form/DayInput";
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
import { createSavingsTransferAction, undoSavingsTransferAction } from "@/lib/customer/savingsGoalActions";
import { savingsError } from "@/lib/customer/savingsDisplay";
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
  today: string;
  // ?to=<goal>: start the form on that goal (Catch up's "move money in").
  presetTo?: string;
}

// Date | From → To | Amount | Undo from md up; phones stack the goals and
// the amount on one line with the date under them.
const COLUMNS = "md:grid-cols-[110px_minmax(0,1fr)_120px_44px]";
const PAGE_SIZE = 25;

// All moves between goals (design: SavingsTransfer): every move, newest
// first, each with Undo while the goal it went to still holds the money,
// and the form for a new one. Only which goal the money counts toward
// changes; the savings account balance stays the same.
export function SavingsTransferPageClient({ businessId, goals, transfers, currency, canManage, today, presetTo }: SavingsTransferPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const listId = useId();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const { page, setPage } = usePageParam();
  const open = goals.filter((goal) => goal.status !== "WITHDRAWN");
  const funded = open.filter((goal) => Number(goal.currentAmount) > 0);
  const [toId, setToId] = useState(presetTo && open.some((goal) => goal.id === presetTo) ? presetTo : "");
  const [fromId, setFromId] = useState(funded.find((goal) => goal.id !== toId)?.id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const from = open.find((goal) => goal.id === fromId);
  const to = open.find((goal) => goal.id === toId);
  const value = Number(amount) || 0;
  const fromSaved = from ? Number(from.currentAmount) : 0;
  const room = to ? Math.max(0, Number(to.targetAmount) - Number(to.currentAmount)) : 0;
  const max = from && to ? Math.min(fromSaved, room) : fromSaved;
  const total = transfers.reduce((sum, transfer) => sum + Number(transfer.amount), 0);
  const shown = paginate(transfers, page, PAGE_SIZE);
  const toAfter = to && Number(to.targetAmount) > 0 ? Math.min(100, Math.round(((Number(to.currentAmount) + value) / Number(to.targetAmount)) * 100)) : 0;
  const problem = !from || !to ? null : value > fromSaved ? t("{name} has only {amount}.", { name: from.name, amount: money(fromSaved) }) : value > room ? t("{name} needs only {amount} more.", { name: to.name, amount: money(room) }) : null;
  const hint = !from
    ? undefined
    : !value || !to
      ? t("Up to {amount} can move from {name}.", { amount: money(max), name: from.name })
      : (problem ?? t("{goal} goes to {percent}% · {from} keeps {amount}", { goal: to.name, percent: formatCount(toAfter, fmt), from: from.name, amount: money(fromSaved - value) }));
  const chips = [5000, 10000].filter((chip) => chip <= max).map((chip) => ({ label: money(chip), amount: chip }));
  if (max > 0) chips.push({ label: t("Max · {amount}", { amount: money(max) }), amount: max });

  function swap() {
    if (!from || !to) return;
    if (Number(to.currentAmount) <= 0) return void toast.error(t("Can't swap: {name} has nothing saved to move.", { name: to.name }));
    setFromId(to.id);
    setToId(from.id);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || !from || !to) return;
    if (!value) return void toast.error(t("Enter an amount to move."));
    if (problem) return void toast.error(problem);
    startTransition(async () => {
      const result = await createSavingsTransferAction(businessId, { fromGoalId: from.id, toGoalId: to.id, amount: value, date, notes: note.trim() || undefined });
      if (!result.success) {
        toast.error(savingsError(result.message, "Failed to move", t, currency, fmt));
        return;
      }
      toast.success(t("{amount} moved from {from} to {to}.", { amount: money(value), from: from.name, to: to.name }));
      setAmount("");
      setNote("");
      setFresh(`${from.id}|${to.id}`);
      // The new move is the newest: show the page it is on.
      setPage(1);
      router.refresh();
    });
  }

  async function undo(row: SavingsTransferRow) {
    const ok = await confirm({
      title: t("Undo this move?"),
      message: t("{amount} goes back to {name}.", { amount: money(row.amount), name: row.fromGoalName }),
      confirmLabel: "Undo move",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await undoSavingsTransferAction(businessId, row.id);
      if (!result.success) {
        toast.error(savingsError(result.message, "Failed to undo the move", t, currency, fmt));
        return;
      }
      toast.success(t("Move undone. {amount} is back in {name}.", { amount: money(row.amount), name: row.fromGoalName }));
      router.refresh();
    });
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-4 md:px-6 md:py-4.5">
      <h2 className="text-title text-ink">{t("History")}</h2>
      {transfers.length > 0 && (
        <span className="text-small text-ink-muted tabular-nums">
          {t(transfers.length === 1 ? "{count} move" : "{count} moves", { count: formatCount(transfers.length, fmt) })} · {money(total)}
        </span>
      )}
    </div>
  );

  const history = (
    <ListCard
      id={listId}
      label={t("History")}
      header={header}
      footer={
        shown.totalPages > 1 && (
          <ListFooter>
            <Pagination page={shown.page} totalPages={shown.totalPages} total={shown.total} pageSize={PAGE_SIZE} onPageChange={setPage} focusTargetId={listId} />
          </ListFooter>
        )
      }
    >
      {transfers.length === 0 ? (
        <ListEmpty tone="info" icon={<ArrowLeftRight />} title={t("No moves yet.")} description={t("Shift money from one goal to another and it shows up here.")} />
      ) : (
        <>
          <ListHead columns={COLUMNS}>
            <ListHeadCell>{t("Date")}</ListHeadCell>
            <ListHeadCell>{t("From → To")}</ListHeadCell>
            <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
            <ListHeadCell>
              <span className="sr-only">{t("Undo")}</span>
            </ListHeadCell>
          </ListHead>
          {shown.rows.map((transfer, index) => (
            <ListRow key={transfer.id} columns={COLUMNS} density="relaxed" className={cn(index === 0 && page === 1 && fresh === `${transfer.fromGoalId}|${transfer.toGoalId}` && "bg-mint-50")}>
              <ListCell className="text-caption text-ink-2 max-md:col-start-1 max-md:row-start-2 md:text-body">{formatDate(transfer.date, undefined, fmt)}</ListCell>
              <ListCell className="flex flex-col gap-0.75 max-md:col-start-1 max-md:row-start-1">
                {/* Read as a sentence; the arrow means nothing out loud. */}
                <span className="sr-only">{t("From {from} to {to}", { from: transfer.fromGoalName, to: transfer.toGoalName })}</span>
                <span aria-hidden="true" className="flex min-w-0 items-center gap-2 font-medium text-ink">
                  <span className="truncate">{transfer.fromGoalName}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-ink-faint" />
                  <span className="truncate">{transfer.toGoalName}</span>
                </span>
                <span className="truncate text-caption font-normal text-ink-muted">{transfer.notes || "—"}</span>
              </ListCell>
              <ListCell align="end" className="font-semibold text-info tabular-nums max-md:col-start-2 max-md:row-start-1">
                {money(transfer.amount)}
              </ListCell>
              <ListCell className="max-md:col-start-2 max-md:row-start-2 max-md:justify-self-end">
                {canManage && transfer.canUndo && (
                  <button type="button" onClick={() => void undo(transfer)} disabled={isPending} aria-label={t("Undo this move")} title={t("Undo this move")} className="flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-50 pointer-coarse:size-11">
                    <Undo2 className="size-3.75" aria-hidden="true" />
                  </button>
                )}
              </ListCell>
            </ListRow>
          ))}
        </>
      )}
    </ListCard>
  );

  const blocked = open.length < 2 ? [t("You need at least two goals to move money between them.")] : funded.length === 0 ? [t("No goal has money saved yet."), t("Add money to a goal first, then you can move it to another.")] : null;
  const label = "text-small font-medium text-ink-2";

  return (
    <PageFrame className="gap-5">
      <PageHeader
        title={t("All moves between goals")}
        description={t("Shift saved money from one goal to another. Only which goal it counts toward changes.")}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/savings-goals/dashboard">
              <ArrowLeft className="text-ink-2" />
              {t("Back to goals")}
            </Link>
          </Button>
        }
      />

      {/* The form first on phones and tablets, so the page's one action comes
          before the history; from xl it sits on the right, as the board has it. */}
      <div className={cn("grid items-start gap-6", canManage && "xl:grid-cols-[minmax(0,1fr)_400px]")}>
        {canManage && (
          <Card asChild padding="none" className="flex flex-col gap-4 p-5 xl:col-start-2 xl:row-start-1">
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
              </section>
            ) : (
              <form onSubmit={submit} aria-labelledby="st-title" noValidate>
                <h2 id="st-title" className="text-title text-ink">
                  {t("New move")}
                </h2>
                <div className="flex flex-col gap-1.5">
                  <label id="st-from-label" htmlFor="st-from" className={label}>
                    {t("From goal")}
                  </label>
                  <GoalPicker id="st-from" labelId="st-from-label" goals={goals} options={funded.filter((goal) => goal.id !== toId)} value={fromId} onChange={setFromId} currency={currency} role="from" />
                </div>
                <div className="-my-2.5 flex justify-center">
                  <button type="button" onClick={swap} disabled={!fromId || !toId} aria-label={t("Swap From and To")} title={t("Swap")} className="relative z-10 flex size-9 items-center justify-center rounded-full border border-input bg-surface text-emerald hover:bg-surface-sunken disabled:opacity-60 pointer-coarse:size-11">
                    <ArrowUpDown className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label id="st-to-label" htmlFor="st-to" className={label}>
                    {t("To goal")}
                  </label>
                  <GoalPicker
                    id="st-to"
                    labelId="st-to-label"
                    goals={goals}
                    options={open.filter((goal) => goal.id !== fromId && Number(goal.currentAmount) < Number(goal.targetAmount))}
                    value={toId}
                    onChange={setToId}
                    currency={currency}
                    role="to"
                  />
                </div>
                <Field htmlFor="st-amount" label={<span className={label}>{t("Amount")}</span>} hint={hint}>
                  <AmountInput id="st-amount" value={amount} onChange={setAmount} currency={currency} size="lg" invalid={!!problem} describedBy={hint ? "st-amount-hint" : undefined} />
                </Field>
                {chips.length > 0 && (
                  <div className="-mt-2 flex flex-wrap gap-1.5">
                    {chips.map((chip) => (
                      <button key={chip.label} type="button" onClick={() => setAmount(String(chip.amount))} className="h-7.5 rounded-full border border-line bg-surface px-2.5 text-caption font-semibold text-ink-2 tabular-nums hover:border-line-strong pointer-coarse:h-11">
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid gap-2.5 sm:grid-cols-[150px_minmax(0,1fr)]">
                  <Field htmlFor="st-date" label={<span className={label}>{t("Date")}</span>}>
                    <DayInput id="st-date" size="md" value={date} onChange={(day) => setDate(day || today)} max={today} />
                  </Field>
                  <Field
                    htmlFor="st-note"
                    label={
                      <span className={label}>
                        {t("Note")} <span className="font-normal text-ink-muted">({t("optional")})</span>
                      </span>
                    }
                  >
                    <Input id="st-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("Why the move?")} />
                  </Field>
                </div>
                <Button type="submit" size="lg" disabled={isPending || !from || !to} className="w-full">
                  {isPending && <Loader size={16} onDark label={t("Loading...")} />}
                  {value > 0 ? t("Move {amount}", { amount: money(value) }) : t("Move money")}
                </Button>
              </form>
            )}
          </Card>
        )}
        <div className={cn(canManage && "xl:col-start-1 xl:row-start-1")}>{history}</div>
      </div>
      {confirmDialog}
    </PageFrame>
  );
}
