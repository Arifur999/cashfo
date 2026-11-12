"use client";

import { useRouter } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { useAmountField } from "@/hooks/useAmountField";
import type { GroupCostSplit, GroupExpense, GroupExpenseCategoryOption, GroupMember, GroupPaidFrom, GroupSplit } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
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
}

const paisa = (value: number | string) => Math.round(Number(value) * 100);

// The ways an expense can be shared, as the popup offers them: "By cost
// split" weighs each member by the group's cost split (Members).
const SPLIT_CHOICES: { value: GroupSplit; label: string }[] = [
  { value: "EQUAL", label: "Equally" },
  { value: "SHARES", label: "By shares" },
  { value: "EXACT", label: "Exact amounts" },
  { value: "MEALS", label: "By meals" },
];

// An expense in the v7 popup: when, the category, how much, who paid it --
// an accountant from the cash they hold (with what it leaves them), or a
// member from their own pocket (credited to them) -- what it was, and how
// it is shared: equally among everyone or the members picked, by the cost
// split, by exact amounts or by meals, with what it does to the balances.
export function ExpenseDrawer({ open, onClose, businessId, currency, members, categories, accountantCash, cashInHand, holderId, costSplit, range, today, editing, meals, mealsOn, closedGuard }: ExpenseDrawerProps) {
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
  const [split, setSplit] = useState<GroupSplit>("EQUAL");
  // The split was picked by hand, so a new category doesn't reset it.
  const [splitTouched, setSplitTouched] = useState(false);
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

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      const startCategory = editing?.category ?? "";
      setAmount(editing ? String(Number(editing.amount)) : "");
      setDate(editing ? editing.date.slice(0, 10) : dayInMonth(range, today));
      setCategory(startCategory);
      setDescription(editing?.description ?? "");
      setPaidFrom(editing?.paidFrom ?? "FUND");
      // A new expense is paid by the accountant who holds the cash.
      setPaidById(editing ? (editing.paidByMemberId ?? "") : (holderId ?? accountants[0]?.id ?? ""));
      setSplit(editing?.split ?? "EQUAL");
      setSplitTouched(!!editing);
      const named = editing?.splits ?? [];
      setIncluded(named.length > 0 ? named.map((s) => s.groupMemberId) : active.map((m) => m.id));
      setUnits(Object.fromEntries(named.filter((s) => s.units !== null).map((s) => [s.groupMemberId, Number(s.units)])));
      setExact(Object.fromEntries(named.filter((s) => s.amount !== null).map((s) => [s.groupMemberId, String(Number(s.amount))])));
      setClosedOk(false);
      setTried(false);
    }
  }

  function pickCategory(name: string) {
    setCategory(name);
    const option = categories.find((c) => c.name === name);
    if (splitTouched || !option) return;
    setSplit(option.defaultSplit);
    // Who shares it follows the category too: its chosen few, or everyone.
    setIncluded((categoryMembers(option, active) ?? active).map((m) => m.id));
  }

  function pickSource(next: GroupPaidFrom) {
    setPaidFrom(next);
    // The person who paid switches lists: an accountant's cash, or anyone's pocket.
    if (next === "FUND" && !accountants.some((member) => member.id === paidById)) setPaidById(holderId ?? accountants[0]?.id ?? "");
    if (next === "MEMBER" && !active.some((member) => member.id === paidById)) setPaidById("");
  }

  const value = Number(amount) || 0;
  const chosen = categories.find((c) => c.name === category);
  const tone = categoryTone(chosen?.color);
  const sharers = active.filter((member) => included.includes(member.id));
  // By meals with meal counting off: everyone shares it equally for now.
  const mealsEqual = split === "MEALS" && !mealsOn;
  const equalCount = mealsEqual ? active.length : sharers.length;
  const each = equalCount > 0 ? value / equalCount : 0;
  // A member's weight in a cost-split expense: what they were given by hand,
  // else their percent (custom) or one each (equal).
  const weightOf = (member: GroupMember) => units[member.id] ?? (costSplit === "CUSTOM" ? Number(member.costPercent ?? 0) : 1);
  const weightTotal = sharers.reduce((sum, member) => sum + weightOf(member), 0);
  const exactTotal = active.reduce((sum, member) => sum + paisa(exact[member.id] || 0), 0);
  const exactLeft = paisa(value) - exactTotal;
  const everyone = sharers.length === active.length;
  const fromFund = paidFrom === "FUND";
  const payer = members.find((member) => member.id === paidById);
  // The cash the accountant holds before this expense: what they hold now,
  // plus this expense back if it was already theirs.
  const accountant = fromFund ? accountants.find((member) => member.id === paidById) : undefined;
  const heldBack = editing && editing.paidFrom === "FUND" && editing.paidByMemberId === accountant?.id ? Number(editing.amount) : 0;
  const cashNow = accountant ? (accountantCash[accountant.id] ?? 0) + heldBack : cashInHand + (editing && editing.paidFrom === "FUND" ? Number(editing.amount) : 0);
  const cashAfter = cashNow - (fromFund ? value : 0);
  // What keeps Save off, said where it is fixed.
  const noPayer = fromFund ? accountants.length > 0 && !accountant : !paidById;
  const noSharers = split !== "MEALS" && split !== "EXACT" && sharers.length === 0;
  const noWeight = split === "SHARES" && sharers.length > 0 && weightTotal <= 0;
  const valid = value > 0 && date.length > 0 && category.length > 0 && !noPayer && !noWeight && (split === "MEALS" || (split === "EXACT" ? exactLeft === 0 && exactTotal > 0 : sharers.length > 0));
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
      const input = { amount: String(value), date, category, description: description.trim() || undefined, paidByMemberId: paidById || undefined, paidFrom, split, splits };
      const result = await attempt(() => (editing ? updateGroupExpenseAction(businessId, editing.id, { ...input, description: description.trim(), paidByMemberId: paidById }) : createGroupExpenseAction(businessId, input)), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (!result.success) {
        toast.error(result.message ?? t("Failed to save the expense"));
        return;
      }
      toast.success(editing ? t("Expense updated") : t("Expense recorded"));
      router.refresh();
      if (addAnother) {
        setAmount("");
        setDescription("");
        setTried(false);
        // Ready for the next one.
        document.getElementById("exp-amount")?.focus();
      } else {
        onClose();
      }
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );

  // Each member's part of this expense as it stands, where the popup can
  // tell (a by-meals cost waits for the month's meal rate).
  const shareOf = (member: GroupMember): number | null => {
    if (split === "MEALS" && !mealsEqual) return null;
    if (split === "EXACT") return Number(exact[member.id] || 0);
    if (split === "SHARES") return included.includes(member.id) && weightTotal > 0 ? (value * weightOf(member)) / weightTotal : 0;
    return mealsEqual || included.includes(member.id) ? each : 0;
  };
  const money = (amount: number) => formatCurrency(amount, currency, fmt);
  // A cash figure below zero, with the true minus the app writes.
  const cashText = (amount: number) => `${amount < 0 ? "− " : ""}${formatCurrency(Math.abs(amount), currency, fmt)}`;
  const parts = active.map((member) => ({ member, share: shareOf(member) })).filter((part): part is { member: GroupMember; share: number } => part.share !== null && part.share > 0.004);
  const payerShare = payer ? (shareOf(payer) ?? 0) : 0;
  // What the category does by default, said under the members.
  const chosenFew = split === "EQUAL" ? categoryMembers(chosen, active) : null;
  const splitWord = SPLIT_CHOICES.find((option) => option.value === split)?.label ?? "Equally";
  const categoryDefault = !chosen
    ? null
    : chosenFew
      ? t("{category} is shared only by {names} by default. You can change it for this one expense.", { category: chosen.name, names: chosenFew.map((member) => shortName(member.name)).join(", ") })
      : chosen.defaultSplit === split && split !== "EQUAL"
        ? t("{category} is shared {how} by default. You can change it for this one expense.", { category: chosen.name, how: t(splitWord).toLowerCase() })
        : null;
  const payers = fromFund ? accountants : active;
  // The board's four ways: the category's own rule, equally, by shares, or
  // amounts typed for each (and by meals, where meals are counted).
  type Mode = "RULE" | GroupSplit;
  const ruleWord = chosen ? t(SPLIT_CHOICES.find((option) => option.value === chosen.defaultSplit)?.label ?? "Equally") : t("Pick a category");
  const modes: { value: Mode; label: string; sub: string }[] = [
    { value: "RULE", label: "Category rule", sub: ruleWord },
    { value: "EQUAL", label: "Equally", sub: t("Same for everyone") },
    { value: "SHARES", label: "By shares", sub: t("By family size") },
    { value: "EXACT", label: "Custom amounts", sub: t("Type each part") },
    ...(meals || split === "MEALS" ? [{ value: "MEALS" as const, label: "By meals", sub: t("At the meal rate") }] : []),
  ];
  const mode: Mode = splitTouched ? split : "RULE";
  function pickMode(next: Mode) {
    if (next === "RULE") {
      setSplitTouched(false);
      const option = categories.find((c) => c.name === category);
      setSplit(option?.defaultSplit ?? "EQUAL");
      setIncluded((categoryMembers(option, active) ?? active).map((m) => m.id));
      return;
    }
    setSplitTouched(true);
    setSplit(next);
    // A way picked by hand shares it among everyone, as the board does.
    if (next !== split) setIncluded(active.map((m) => m.id));
  }
  // Custom amounts filled in equal parts, the last taking the paisa left over.
  function fillEqually() {
    if (value <= 0 || active.length === 0) return;
    const total = paisa(value);
    const part = Math.floor(total / active.length);
    setExact(Object.fromEntries(active.map((member, i) => [member.id, String((i === active.length - 1 ? total - part * (active.length - 1) : part) / 100)])));
  }

  return (
    <GroupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={620}
      title={editing ? t("Edit expense") : t("Add expense")}
      sub={t("Money spent for the group")}
      onSubmit={(event) => {
        event.preventDefault();
        void save(false);
      }}
      footer={
        <>
          <Button type="button" variant="ghost" size="lg" onClick={onClose} disabled={isPending} className="px-4 text-ink-2">
            {t("Cancel")}
          </Button>
          <Button type="submit" size="lg" disabled={isPending} className="px-5.5">
            {isPending && <Loader />}
            {editing ? t("Save changes") : t("Save expense")}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-3">
        <Field htmlFor="exp-desc" label={label(t("What for"), true)}>
          <Input id="exp-desc" size="md" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={140} placeholder={t("e.g. Fish & vegetables")} frameClassName="h-11.5 rounded-[12px]" />
        </Field>
        <Field htmlFor="exp-amount" label={label(t("Amount"))}>
          <Input id="exp-amount" size="md" inputMode="decimal" {...amountField} autoFocus placeholder="0" invalid={tried && !(value > 0)} className="font-semibold tabular-nums" leading={<span className="text-[15px] font-semibold text-ink-faint">{currencySymbol(currency, fmt)}</span>} frameClassName="h-11.5 rounded-[12px]" />
        </Field>
      </div>
      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-3">
        <Field htmlFor="exp-category" label={label(t("Category"))} hint={offered.length === 0 ? t("Add categories under Categories.") : undefined}>
          <span className="relative flex items-center">
            {chosen && <span className={cn("pointer-events-none absolute left-2.5 z-1 flex size-6.5 items-center justify-center rounded-[7px] [&_svg]:size-3.5", tone.bg, tone.fg)}>{chosen.icon ? createElement(budgetCategoryIcon(chosen.icon), { "aria-hidden": true }) : null}</span>}
            <NativeSelect id="exp-category" size="md" value={category} onChange={(event) => pickCategory(event.target.value)} frameClassName="w-full" className={cn("font-semibold", chosen && "pl-11")} invalid={tried && !category}>
              <option value="">{t("Select category")}</option>
              {offered.map((option) => (
                <option key={option.id} value={option.name}>
                  {option.name}
                </option>
              ))}
            </NativeSelect>
          </span>
        </Field>
        <Field htmlFor="exp-date" label={label(t("Date"))}>
          <DayInput id="exp-date" size="md" value={date} onChange={setDate} max={today} />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-ink-2">{t("Paid from")}</span>
        <div role="radiogroup" aria-label={t("Paid from")} className="grid grid-cols-2 gap-2">
          {(
            [
              ["FUND", "Group cash", "Paid out of the money members gave"],
              ["MEMBER", "Own pocket", "A member paid with their own money"],
            ] as const
          ).map(([value_, title, sub]) => {
            const on = paidFrom === value_;
            return (
              <button key={value_} type="button" role="radio" aria-checked={on} onClick={() => pickSource(value_)} className={cn("flex items-start gap-2.5 rounded-[12px] border-[1.5px] px-3 py-2.5 text-left", on ? "border-emerald bg-emerald-wash" : "border-line bg-surface hover:border-mint-200")}>
                <span aria-hidden="true" className={cn("mt-px size-4 shrink-0 rounded-full border-2 bg-surface", on ? "border-[5px] border-emerald" : "border-input")} />
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="text-[13.5px] font-semibold text-ink">{t(title)}</span>
                  <span className="text-caption text-ink-muted">{t(sub)}</span>
                </span>
              </button>
            );
          })}
        </div>
        <label htmlFor="exp-paid" className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">{fromFund ? t("Who paid it out") : t("Who paid")}</span>
          {payers.length > 0 ? (
            <NativeSelect id="exp-paid" size="md" value={paidById} onChange={(event) => setPaidById(event.target.value)} frameClassName="w-full" className="h-11 rounded-[12px] font-normal" invalid={tried && noPayer}>
              {!paidById && <option value="">{t("Choose who paid")}</option>}
              {payers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </NativeSelect>
          ) : (
            <span className="rounded-[12px] bg-surface-sunken px-3 py-2.5 text-[13px] leading-normal text-ink-soft">{t("Nobody keeps group cash yet. Choose an Editor in Members.")}</span>
          )}
          {fromFund && accountant && value > 0 && (
            <span className={cn("text-caption", cashAfter < 0 ? "text-warning" : "text-ink-muted")}>{t("Cash with {name}: {before} → {after}", { name: shortName(accountant.name), before: cashText(cashNow), after: cashText(cashAfter) })}</span>
          )}
          {!fromFund && payer && value > 0 && <span className="text-caption text-ink-muted">{t("{name} gets {amount} back in their balance.", { name: shortName(payer.name), amount: money(Math.max(0, value - payerShare)) })}</span>}
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-ink-2">{t("How it is shared")}</span>
        <div role="radiogroup" aria-label={t("How it is shared")} className={cn("grid gap-2", modes.length > 4 ? "grid-cols-5" : "grid-cols-2 sm:grid-cols-4")}>
          {modes.map((option) => {
            const on = mode === option.value;
            return (
              <button key={option.value} type="button" role="radio" aria-checked={on} onClick={() => pickMode(option.value)} className={cn("flex min-w-0 flex-col items-start gap-px rounded-[12px] border-[1.5px] px-2.5 py-2 text-left", on ? "border-emerald bg-emerald-wash" : "border-line bg-surface hover:border-mint-200")}>
                <span className={cn("max-w-full truncate text-[13px] font-semibold", on ? "text-emerald" : "text-ink")}>{t(option.label)}</span>
                <span className="max-w-full truncate text-[11.5px] text-ink-muted">{option.sub}</span>
              </button>
            );
          })}
        </div>
        {categoryDefault && mode === "RULE" && <span className="text-caption text-ink-muted">{categoryDefault}</span>}
        {split === "EQUAL" && !everyone && mode !== "RULE" && (
          <span className="text-caption text-ink-muted">{t("Shared only by {names}.", { names: sharers.map((member) => shortName(member.name)).join(", ") })}</span>
        )}
        {split === "EXACT" && (
          <div className="flex flex-col gap-2 rounded-[12px] border border-line bg-hover p-3">
            <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
              {active.map((member) => (
                <label key={member.id} className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{member.name}</span>
                  <span className="flex h-9.5 w-30 shrink-0 items-center gap-1 rounded-[10px] border border-input bg-surface px-2.5 focus-within:border-focus-ring">
                    <span className="text-caption text-ink-faint">{currencySymbol(currency, fmt)}</span>
                    <input value={exact[member.id] ?? ""} onChange={(event) => setExact({ ...exact, [member.id]: event.target.value.replace(/[^\d.]/g, "") })} inputMode="decimal" placeholder="0" aria-label={t("{name}’s part", { name: member.name })} className="w-full min-w-0 bg-transparent text-right text-[13.5px] font-semibold text-ink tabular-nums outline-none" />
                  </span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span aria-live="polite" className={cn("text-[12.5px] font-semibold", value <= 0 ? "text-ink-muted" : exactLeft === 0 ? "text-tint-green-ink" : "text-warning")}>
                {value <= 0 ? t("Enter the amount first") : exactLeft === 0 ? t("All assigned") : exactLeft > 0 ? t("{amount} left to assign", { amount: money(exactLeft / 100) }) : t("{amount} too much", { amount: money(-exactLeft / 100) })}
              </span>
              <button type="button" onClick={fillEqually} disabled={value <= 0} className="h-7.5 rounded-sm px-2.5 text-[12.5px] font-semibold text-emerald hover:bg-emerald-wash disabled:opacity-50">
                {t("Split equally")}
              </button>
            </div>
          </div>
        )}
        {tried && noSharers && <span className="text-[12.5px] text-expense">{t("Pick at least one member to share it.")}</span>}
      </div>

      {value > 0 && parts.length > 0 && (
        <div aria-live="polite" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[12px] border border-emerald-line bg-emerald-wash px-3.5 py-2.5 text-[13px] text-brand-ink">
          <span className="font-semibold">{t("Each part:")}</span>
          {parts.map((part) => (
            <span key={part.member.id} className="whitespace-nowrap">
              {shortName(part.member.name)} <b className="tabular-nums">{money(part.share)}</b>
            </span>
          ))}
        </div>
      )}
      {split === "MEALS" && !mealsEqual && value > 0 && <p className="text-caption text-ink-muted">{t("Shared at the month's meal rate: each member's part is known once the month's meals are in.")}</p>}

      {tried && !valid && <p className="text-small font-semibold text-expense">{t("Fill in date, category, amount and who paid.")}</p>}
    </GroupDialog>
  );
}
