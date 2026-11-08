"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckChip } from "@/components/modules/Customer/Settings/boardUi";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { useAmountField } from "@/hooks/useAmountField";
import type { GroupCostSplit, GroupExpense, GroupExpenseCategoryOption, GroupMember, GroupPaidFrom, GroupSplit } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { categoryMembers, type MonthRange, shortName } from "@/lib/customer/groupDisplay";
import { createGroupExpenseAction, updateGroupExpenseAction } from "@/lib/customer/groupExpensesActions";
import { accountantsOf } from "@/lib/customer/groupFamily";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { dayInMonth } from "./ContributionDrawer";
import { GroupDialog } from "./GroupDialog";
import type { ClosedGuard } from "./groupTypes";

interface ExpenseDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  members: GroupMember[];
  categories: GroupExpenseCategoryOption[];
  // Each accountant's cash right now (the Cash book's figure), and the
  // cash in hand of a group with no accountant.
  accountantCash: Record<string, number>;
  cashInHand: number;
  // The accountant who pays when nobody is picked.
  holderId: string | null;
  costSplit: GroupCostSplit;
  range: MonthRange;
  today: string;
  editing: GroupExpense | null;
  // Whether "By meals" is offered (a mess, or meal counting on).
  meals: boolean;
  // Whether meals are counted: while they aren't, a by-meals cost is shared
  // equally.
  mealsOn: boolean;
  closedGuard: ClosedGuard;
  // An Editor adds expenses only in their own name: they are who paid.
  selfOnly?: string | null;
}

const paisa = (value: number | string) => Math.round(Number(value) * 100);

// "Category rule" follows the category's own way of sharing; the others
// set it for this one expense.
type ShareChoice = "RULE" | GroupSplit;
const SPLIT_WORDS: Record<GroupSplit, { label: string; sub: string }> = {
  EQUAL: { label: "Equally", sub: "Same for everyone" },
  SHARES: { label: "By shares", sub: "By the cost split" },
  EXACT: { label: "Custom amounts", sub: "Type each part" },
  MEALS: { label: "By meals", sub: "By the meals eaten" },
};

// A radio card, as the board draws them: a ring, a label and a line.
function ChoiceCard({ on, label, sub, onPick, ring = false }: { on: boolean; label: string; sub: string; onPick: () => void; ring?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onPick}
      className={cn("flex min-w-0 items-start gap-2.5 rounded-xl border-[1.5px] text-left transition-colors", ring ? "px-3 py-2.5" : "flex-col gap-px px-2.5 py-2", on ? "border-emerald bg-mint-50/60" : "border-line bg-surface hover:border-mint-200")}
    >
      {ring && <span aria-hidden="true" className={cn("mt-px size-4 shrink-0 rounded-full bg-surface", on ? "border-[5px] border-emerald" : "border-[1.5px] border-line-strong")} />}
      <span className="flex min-w-0 max-w-full flex-col gap-px">
        <span className={cn("truncate font-semibold", ring ? "text-[13.5px] text-ink" : cn("text-[13px]", on ? "text-emerald" : "text-ink"))}>{label}</span>
        <span className="truncate text-[11.5px] text-ink-muted">{sub}</span>
      </span>
    </button>
  );
}

// An expense (the v16 FamilyExpenses board's Add expense): what it was for
// and how much, its category and day, where the money came from -- group
// cash an accountant holds (with what it leaves them) or a member's own
// pocket (credited to them) -- and how it is shared: by the category's
// rule, equally among everyone or the members ticked, by the cost split,
// by custom amounts, or by meals; then each person's part.
export function ExpenseDrawer({ open, onClose, businessId, currency, members, categories, accountantCash, cashInHand, holderId, costSplit, range, today, editing, meals, mealsOn, closedGuard, selfOnly = null }: ExpenseDrawerProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const active = members.filter((member) => member.status === "ACTIVE");
  const accountants = accountantsOf(members);
  const [amount, setAmount] = useState("");
  const amountField = useAmountField(amount, setAmount, currency);
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [paidById, setPaidById] = useState("");
  const [paidFrom, setPaidFrom] = useState<GroupPaidFrom>("FUND");
  const [choice, setChoice] = useState<ShareChoice>("RULE");
  const [included, setIncluded] = useState<string[]>([]);
  // Units an older expense gave some members by hand; kept as they were.
  const [units, setUnits] = useState<Record<string, number>>({});
  const [exact, setExact] = useState<Record<string, string>>({});
  // A closed month was asked about once already while it is open.
  const [closedOk, setClosedOk] = useState(false);
  const [tried, setTried] = useState(false);
  const [isPending, startTransition] = useTransition();
  // Hidden categories aren't offered, unless this expense is in one.
  const offered = categories.filter((option) => !option.hidden || option.name === editing?.category);
  // Who an Editor may name: only themself (an older entry keeps its person).
  const mayName = (member: GroupMember) => !selfOnly || member.id === selfOnly || member.id === editing?.paidByMemberId;

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setAmount(editing ? String(Number(editing.amount)) : "");
      setDate(editing ? editing.date.slice(0, 10) : dayInMonth(range, today));
      setCategory(editing?.category ?? "");
      setDescription(editing?.description ?? "");
      // An Editor pays from the cash they hold when they hold some, else their pocket.
      const editorHolds = !!selfOnly && accountants.some((member) => member.id === selfOnly);
      setPaidFrom(editing?.paidFrom ?? (selfOnly && !editorHolds ? "MEMBER" : "FUND"));
      setPaidById(editing ? (editing.paidByMemberId ?? "") : (selfOnly ?? holderId ?? accountants[0]?.id ?? ""));
      setChoice(editing ? editing.split : "RULE");
      const named = editing?.splits ?? [];
      setIncluded(named.length > 0 ? named.map((s) => s.groupMemberId) : active.map((m) => m.id));
      setUnits(Object.fromEntries(named.filter((s) => s.units !== null).map((s) => [s.groupMemberId, Number(s.units)])));
      setExact(Object.fromEntries(named.filter((s) => s.amount !== null).map((s) => [s.groupMemberId, String(Number(s.amount))])));
      setClosedOk(false);
      setTried(false);
    }
  }

  const chosen = categories.find((c) => c.name === category);
  // The way it is shared: the category's own while "Category rule" is on.
  const split: GroupSplit = choice === "RULE" ? (chosen?.defaultSplit ?? "EQUAL") : choice;
  // Who shares it: the category's chosen few by its rule, else the ticks.
  const sharerIds = choice === "RULE" ? (categoryMembers(chosen, active) ?? active).map((member) => member.id) : included;

  function pickCategory(name: string) {
    setCategory(name);
  }

  function pickChoice(next: ShareChoice) {
    // Leaving the rule starts from what it gave.
    if (choice === "RULE" && next !== "RULE") setIncluded(sharerIds);
    setChoice(next);
  }

  function pickSource(next: GroupPaidFrom) {
    setPaidFrom(next);
    // The person who paid switches lists: an accountant's cash, or anyone's pocket.
    if (next === "FUND" && !accountants.some((member) => member.id === paidById)) setPaidById(selfOnly ?? holderId ?? accountants[0]?.id ?? "");
    if (next === "MEMBER" && !active.some((member) => member.id === paidById)) setPaidById(selfOnly ?? "");
  }

  const toggle = (id: string) => setIncluded(included.includes(id) ? included.filter((x) => x !== id) : [...included, id]);

  const value = Number(amount) || 0;
  const sharers = active.filter((member) => sharerIds.includes(member.id));
  // By meals with meal counting off: everyone shares it equally for now.
  const mealsEqual = split === "MEALS" && !mealsOn;
  const equalCount = mealsEqual ? active.length : sharers.length;
  // A member's weight in a by-shares expense: what they were given by hand,
  // else their percent (custom cost split) or one each (equal).
  const weightOf = (member: GroupMember) => units[member.id] ?? (costSplit === "CUSTOM" ? Number(member.costPercent ?? 0) : 1);
  const weightTotal = sharers.reduce((sum, member) => sum + weightOf(member), 0);
  const exactTotal = active.reduce((sum, member) => sum + paisa(exact[member.id] || 0), 0);
  const exactLeft = paisa(value) - exactTotal;
  const everyone = sharers.length === active.length;
  const fromFund = paidFrom === "FUND";
  // The cash the accountant holds before this expense: what they hold now,
  // plus this expense back if it was already theirs.
  const accountant = fromFund ? accountants.find((member) => member.id === paidById) : undefined;
  const heldBack = editing && editing.paidFrom === "FUND" && editing.paidByMemberId === accountant?.id ? Number(editing.amount) : 0;
  const cashNow = accountant ? (accountantCash[accountant.id] ?? 0) + heldBack : cashInHand + (editing && editing.paidFrom === "FUND" ? Number(editing.amount) : 0);
  const cashAfter = cashNow - (fromFund ? value : 0);
  const payers = (fromFund ? accountants : active).filter(mayName);
  // What keeps Save off, said where it is fixed.
  const errors = {
    what: !description.trim() ? t("Write what it was for.") : null,
    amount: !(value > 0) ? t("Enter the amount.") : null,
    category: !category ? t("Pick a category.") : null,
    date: !date ? t("Pick a date.") : null,
    who: fromFund
      ? accountants.length > 0 && !accountant
        ? t("Pick who paid it out of the group cash.")
        : selfOnly && !accountant
          ? t("No cash holder to pick: choose Own pocket.")
          : null
      : !paidById
        ? t("Pick who paid from their own pocket.")
        : null,
    parts:
      split === "EXACT" && value > 0 && exactLeft !== 0
        ? t("The parts add up to {sum}. They must add up to {total}.", { sum: formatCurrency(exactTotal / 100, currency, fmt), total: formatCurrency(value, currency, fmt) })
        : split !== "MEALS" && split !== "EXACT" && sharers.length === 0
          ? t("Tick at least one member to share it")
          : split === "SHARES" && sharers.length > 0 && weightTotal <= 0
            ? t("The members ticked have no cost share. Set the cost split in Members.")
            : null,
  };
  const valid = Object.values(errors).every((error) => error === null);
  // What the splits say: none when everyone in the group shares the plain way.
  const splits =
    split === "EXACT"
      ? active.filter((member) => paisa(exact[member.id] || 0) > 0).map((member) => ({ groupMemberId: member.id, amount: String(Number(exact[member.id])) }))
      : split === "SHARES"
        ? everyone && sharers.every((member) => units[member.id] === undefined)
          ? []
          : sharers.map((member) => ({ groupMemberId: member.id, units: units[member.id] ?? null }))
        : split === "EQUAL" && !everyone
          ? sharers.map((member) => ({ groupMemberId: member.id }))
          : [];

  async function save(addAnother: boolean) {
    setTried(true);
    if (!valid || isPending) return;
    // A new expense (or one moved to another day) inside a closed month:
    // ask first. An edit was asked about when it was opened.
    const moved = !editing || editing.date.slice(0, 10) !== date;
    if (moved && closedGuard.isClosed(date) && !closedOk) {
      if (!(await closedGuard.ask(date))) return;
      setClosedOk(true);
    }
    startTransition(async () => {
      const input = { amount: String(value), date, category, description: description.trim(), paidByMemberId: paidById || undefined, paidFrom, split, splits };
      const result = await attempt(() => (editing ? updateGroupExpenseAction(businessId, editing.id, { ...input, paidByMemberId: paidById }) : createGroupExpenseAction(businessId, input)), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (!result.success) {
        toast.error(result.message ?? t("Failed to save the expense"));
        return;
      }
      toast.success(editing ? t("Changes saved") : t("Expense added"));
      router.refresh();
      if (addAnother) {
        setAmount("");
        setDescription("");
        setTried(false);
        // Ready for the next one.
        document.getElementById("exp-what")?.focus();
      } else {
        onClose();
      }
    });
  }

  // Each member's part of this expense as it stands, where the popup can
  // tell (a by-meals cost waits for the month's meal rate).
  const shareOf = (member: GroupMember): number | null => {
    if (split === "MEALS" && !mealsEqual) return null;
    if (split === "EXACT") return Number(exact[member.id] || 0);
    if (split === "SHARES") return sharerIds.includes(member.id) && weightTotal > 0 ? (value * weightOf(member)) / weightTotal : 0;
    return mealsEqual || sharerIds.includes(member.id) ? (equalCount > 0 ? value / equalCount : 0) : 0;
  };
  const money = (figure: number) => formatCurrency(figure, currency, fmt);
  // A cash figure below zero, with the true minus the app writes.
  const cashText = (figure: number) => `${figure < 0 ? "− " : ""}${formatCurrency(Math.abs(figure), currency, fmt)}`;
  const parts = value > 0 && category ? active.map((member) => ({ member, share: shareOf(member) })).filter((part): part is { member: GroupMember; share: number } => part.share !== null && part.share > 0.004) : [];
  const shareChoices: ShareChoice[] = ["RULE", "EQUAL", "SHARES", "EXACT", ...(meals || split === "MEALS" ? (["MEALS"] as const) : [])];
  const ruleSub = chosen ? t(SPLIT_WORDS[chosen.defaultSplit].label) : t("Pick a category");
  const payer = members.find((member) => member.id === paidById);
  const show = (error: string | null) => (tried ? error : null);
  // The cash line under who paid: what they hold, and after this.
  const whoHint = fromFund ? (
    accountant || accountants.length === 0 ? (
      <span className={cn("text-caption", value > 0 && cashAfter < 0 ? "text-warning" : "text-ink-muted")}>
        {accountant ? t("Cash with {name}: {cash}", { name: shortName(accountant.name), cash: cashText(cashNow) }) : t("Cash in hand: {cash}", { cash: cashText(cashNow) })}
        {value > 0 && t(", after this {cash}", { cash: cashText(cashAfter) })}
        {value > 0 && cashAfter < 0 && t(" (more than the cash in hand)")}
      </span>
    ) : null
  ) : payer ? (
    <span className="text-caption text-ink-muted">{t("This counts as {name}’s contribution.", { name: shortName(payer.name) })}</span>
  ) : null;

  return (
    <GroupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={620}
      title={editing ? t("Edit expense") : t("Add expense")}
      sub={t("Something the group paid for")}
      onSubmit={(event) => {
        event.preventDefault();
        void save(false);
      }}
      footer={
        <>
          {!editing && (
            <Button type="button" variant="secondary" onClick={() => void save(true)} disabled={isPending} className="mr-auto max-sm:w-full">
              {t("Save & add another")}
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending} className="px-5.5">
            {isPending && <Loader />}
            {editing ? t("Save changes") : t("Save expense")}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Field htmlFor="exp-what" label={t("What for")} error={show(errors.what)}>
          <Input id="exp-what" size="lg" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={80} placeholder={t("e.g. Fish and vegetables")} invalid={!!show(errors.what)} autoFocus />
        </Field>
        <Field htmlFor="exp-amount" label={t("Amount")} error={show(errors.amount)}>
          <Input id="exp-amount" size="lg" inputMode="decimal" {...amountField} placeholder="0" invalid={!!show(errors.amount)} className="text-[16px] font-bold tabular-nums" leading={<span className="text-[15px] font-semibold text-ink-faint">{currencySymbol(currency, fmt)}</span>} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Field htmlFor="exp-category" label={t("Category")} error={show(errors.category)} hint={offered.length === 0 ? t("Add categories under Categories.") : undefined}>
          <NativeSelect id="exp-category" size="lg" value={category} onChange={(event) => pickCategory(event.target.value)} frameClassName="w-full" invalid={!!show(errors.category)}>
            <option value="" disabled>
              {t("Choose a category")}
            </option>
            {offered.map((option) => (
              <option key={option.id} value={option.name}>
                {`${option.name} · ${t(SPLIT_WORDS[option.defaultSplit].label).toLowerCase()}`}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field htmlFor="exp-date" label={t("Date")} error={show(errors.date)}>
          <DayInput id="exp-date" size="lg" value={date} onChange={setDate} max={today} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-body leading-[normal] font-semibold text-ink-2">{t("Paid from")}</legend>
        <div role="radiogroup" aria-label={t("Paid from")} className="grid grid-cols-2 gap-2">
          <ChoiceCard ring on={fromFund} label={t("Group cash")} sub={t("Paid out of the money members gave")} onPick={() => pickSource("FUND")} />
          <ChoiceCard ring on={!fromFund} label={t("Own pocket")} sub={t("A member paid with their own money")} onPick={() => pickSource("MEMBER")} />
        </div>
        {(payers.length > 0 || !fromFund) && (
          <Field htmlFor="exp-paid" label={fromFund ? t("Who paid it out") : t("Who paid")} error={show(errors.who)}>
            <NativeSelect id="exp-paid" size="md" value={paidById} onChange={(event) => setPaidById(event.target.value)} frameClassName="w-full" invalid={!!show(errors.who)} disabled={!!selfOnly && payers.length <= 1}>
              <option value="" disabled>
                {fromFund ? t("Choose the cash holder") : t("Choose the member")}
              </option>
              {payers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
        {fromFund && payers.length === 0 && accountants.length > 0 && <span className="rounded-xl bg-strip px-3 py-2.5 text-small leading-[1.5] text-ink-2">{t("No cash holder to pick: the Editor who holds group cash adds these. Choose Own pocket, or ask the Editor.")}</span>}
        {whoHint}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-body leading-[normal] font-semibold text-ink-2">{t("How to share")}</legend>
        <div role="radiogroup" aria-label={t("How to share")} className={cn("grid grid-cols-2 gap-2", shareChoices.length > 4 ? "sm:grid-cols-5" : "sm:grid-cols-4")}>
          {shareChoices.map((option) => (
            <ChoiceCard key={option} on={choice === option} label={option === "RULE" ? t("Category rule") : t(SPLIT_WORDS[option].label)} sub={option === "RULE" ? ruleSub : t(SPLIT_WORDS[option].sub)} onPick={() => pickChoice(option)} />
          ))}
        </div>
        {split === "MEALS" ? (
          <span className="text-small text-ink-muted">{mealsOn ? t("Shared by the meals each member eats this month, at the month's meal rate.") : t("Meal counting is off, so this is shared equally among everyone for now.")}</span>
        ) : split === "EXACT" ? (
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-strip p-3">
            <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
              {active.map((member) => (
                <label key={member.id} className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink" title={member.name}>
                    {member.name}
                  </span>
                  <Input
                    size="sm"
                    inputMode="decimal"
                    value={exact[member.id] ?? ""}
                    onChange={(event) => setExact({ ...exact, [member.id]: event.target.value.replace(/[^\d.]/g, "") })}
                    placeholder="0"
                    aria-label={t("Part for {name}", { name: member.name })}
                    frameClassName="w-30 shrink-0"
                    className="text-right font-semibold tabular-nums"
                    leading={<span className="text-[13px] text-ink-faint">{currencySymbol(currency, fmt)}</span>}
                  />
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span aria-live="polite" className={cn("text-[12.5px] font-semibold", !(value > 0) ? "text-ink-muted" : exactLeft === 0 ? "text-income" : exactLeft > 0 ? "text-warning" : "text-expense")}>
                {!(value > 0) ? t("Enter the amount first") : exactLeft === 0 ? t("All assigned") : exactLeft > 0 ? t("{amount} left to assign", { amount: money(exactLeft / 100) }) : t("{amount} too much", { amount: money(-exactLeft / 100) })}
              </span>
              <button
                type="button"
                disabled={!(value > 0)}
                onClick={() => {
                  // Equal parts in paisa; the last takes the remainder.
                  const each = Math.floor(paisa(value) / active.length);
                  setExact(Object.fromEntries(active.map((member, index) => [member.id, String((index === active.length - 1 ? paisa(value) - each * (active.length - 1) : each) / 100)])));
                }}
                className="h-7.5 rounded-lg px-2.5 text-[12.5px] font-semibold text-emerald hover:bg-mint-50 disabled:opacity-50"
              >
                {t("Split equally")}
              </button>
            </div>
          </div>
        ) : choice !== "RULE" ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("Who shares it")}>
            {active.map((member) => (
              <CheckChip key={member.id} on={included.includes(member.id)} label={shortName(member.name)} onClick={() => toggle(member.id)} />
            ))}
          </div>
        ) : null}
        {show(errors.parts) && <span className="text-small font-semibold text-expense">{errors.parts}</span>}
      </fieldset>

      {parts.length > 0 && (
        <div aria-live="polite" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-emerald-line bg-mint-50/60 px-3.5 py-2.5 text-small text-brand-ink">
          <span className="font-semibold">{t("Each part:")}</span>
          {parts.map((part) => (
            <span key={part.member.id} className="whitespace-nowrap">
              {shortName(part.member.name)} <b className="tabular-nums">{money(part.share)}</b>
            </span>
          ))}
        </div>
      )}
    </GroupDialog>
  );
}
