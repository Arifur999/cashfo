"use client";

import { Check, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import Textarea from "@/components/smartly/form/Textarea";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { useAmountField } from "@/hooks/useAmountField";
import type { GroupCostSplit, GroupExpense, GroupExpenseCategoryOption, GroupMember, GroupPaidFrom, GroupSplit } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { currencySymbol, formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { categoryMembers, countLabel, type MonthRange, shortName } from "@/lib/customer/groupDisplay";
import { createGroupExpenseAction, updateGroupExpenseAction } from "@/lib/customer/groupExpensesActions";
import { accountantsOf } from "@/lib/customer/groupFamily";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { dayInMonth } from "./ContributionDrawer";
import { FOCUS_WITHIN, MemberAvatar } from "./GroupBits";
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
  { value: "SHARES", label: "By cost split" },
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

  const toggle = (id: string) => setIncluded(included.includes(id) ? included.filter((x) => x !== id) : [...included, id]);

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
  const monthLabel = monthName(range.key, fmt);
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
  const others = parts.filter((part) => fromFund || part.member.id !== payer?.id);
  const splitChoices = SPLIT_CHOICES.filter((option) => option.value !== "MEALS" || meals || split === "MEALS");
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

  return (
    <GroupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={520}
      title={editing ? t("Edit expense") : t("Add expense")}
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
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending} className="px-4.5">
            {isPending && <Loader />}
            {editing ? t("Save changes") : t("Save expense")}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field htmlFor="exp-date" label={label(t("Date"))}>
          <DayInput id="exp-date" size="md" value={date} onChange={setDate} max={today} />
        </Field>
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
      </div>

      <Field htmlFor="exp-amount" label={label(t("Amount"))}>
        <Input
          id="exp-amount"
          size="lg"
          inputMode="decimal"
          {...amountField}
          autoFocus
          placeholder="0"
          invalid={tried && !(value > 0)}
          className="text-h3 font-bold tabular-nums"
          leading={<span className="flex h-12 w-10 items-center justify-center border-r border-line bg-strip text-[17px] font-semibold text-ink-soft">{currencySymbol(currency)}</span>}
          frameClassName="overflow-hidden pl-0"
        />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-body leading-[normal] font-medium text-ink">{t("Paid from")}</legend>
        <SegmentedControl<GroupPaidFrom>
          options={[
            { value: "FUND", label: accountants.length > 0 ? "Accountant's cash" : "Group fund" },
            { value: "MEMBER", label: "Own pocket" },
          ]}
          value={paidFrom}
          onChange={pickSource}
          label="Paid from"
          variant="pill"
          stretch
          className="rounded-[9px] [&>button]:h-8 [&>button]:text-small"
        />
        {(payers.length > 0 || !fromFund) && (
          <NativeSelect id="exp-paid" size="md" value={paidById} onChange={(event) => setPaidById(event.target.value)} frameClassName="w-full" aria-label={t(fromFund ? "Paid by accountant" : "Whose pocket")} invalid={tried && noPayer}>
            <option value="">{t(fromFund ? "Select accountant" : "Pick a member")}</option>
            {payers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </NativeSelect>
        )}
        {fromFund ? (
          (accountant || accountants.length === 0) && (
            <div className="flex flex-col gap-2 rounded-field border border-line bg-strip px-3.5 py-3">
              <div className="grid grid-cols-3 gap-2 text-small tabular-nums">
                <span className="flex flex-col">
                  <span className="text-caption text-ink-muted">{accountant ? t("Cash with {name}", { name: shortName(accountant.name) }) : t("Cash in hand")}</span>
                  <b className={cn("font-bold", cashNow < 0 ? "text-warning" : "text-ink")}>{cashText(cashNow)}</b>
                </span>
                <span className="flex flex-col">
                  <span className="text-caption text-ink-muted">{t("This expense")}</span>
                  <b className="font-bold text-ink">− {money(value)}</b>
                </span>
                <span className="flex flex-col">
                  <span className="text-caption text-ink-muted">{t("Left after")}</span>
                  <b className={cn("font-bold", cashAfter < 0 ? "text-expense" : "text-ink")}>{cashText(cashAfter)}</b>
                </span>
              </div>
              {cashAfter < 0 && value > 0 && (
                <span className="flex items-start gap-2 text-caption text-warning">
                  <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                  {accountant ? t("{name} doesn't have enough cash — the extra will count as paid from own pocket.", { name: shortName(accountant.name) }) : t("More is being spent than the fund holds. Record the contributions that covered it.")}
                </span>
              )}
            </div>
          )
        ) : (
          <span className={cn("flex items-center gap-1.5 text-[12.5px] leading-snug", noPayer ? "font-semibold text-warning" : "text-brand-ink")}>
            {!noPayer && <Check className="size-3.75 shrink-0 text-emerald" strokeWidth={2.5} aria-hidden="true" />}
            {noPayer ? t("Pick whose pocket it came from") : t("{name} is credited {amount}. The fund's cash stays the same.", { name: shortName(payer?.name), amount: money(value) })}
          </span>
        )}
      </fieldset>

      <Field htmlFor="exp-desc" label={label(t("Description"), true)}>
        <Textarea id="exp-desc" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={140} placeholder={t("e.g. Fish & vegetables")} />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-body leading-[normal] font-medium text-ink">{t("How is it shared?")}</legend>
        <SegmentedControl<GroupSplit>
          options={splitChoices}
          value={split}
          onChange={(next) => {
            setSplit(next);
            setSplitTouched(true);
          }}
          label="How is it shared?"
          variant="pill"
          stretch
          className="rounded-[9px] [&>button]:h-8 [&>button]:px-2 [&>button]:text-small"
        />
        {split === "MEALS" ? (
          <span className="text-small text-ink-muted">{mealsOn ? t("Shared by the meals each member eats this month, at the month's meal rate.") : t("Meal counting is off, so this is shared equally among everyone for now.")}</span>
        ) : (
          <div className="flex flex-col overflow-hidden rounded-field border border-line">
            {active.map((member) => {
              const on = included.includes(member.id);
              const share = shareOf(member) ?? 0;
              return (
                <div key={member.id} className="flex min-h-11 items-center gap-2.5 border-b border-divider px-3 py-1 tabular-nums">
                  {split !== "EXACT" ? (
                    // A real checkbox under the box: the name is its label.
                    <label className={cn("flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-sm text-left", FOCUS_WITHIN)}>
                      <input type="checkbox" checked={on} onChange={() => toggle(member.id)} className="sr-only" aria-label={t("Include {name}", { name: member.name })} />
                      <span aria-hidden="true" className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border", on ? "border-emerald bg-emerald text-on-action" : "border-line-strong bg-surface")}>
                        {on && <Check className="size-3" strokeWidth={3.5} />}
                      </span>
                      <MemberAvatar member={member} members={members} size={24} />
                      <span className={cn("truncate text-body font-medium", on ? "text-ink" : "text-ink-muted")} title={member.name}>
                        {shortName(member.name)}
                      </span>
                    </label>
                  ) : (
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <MemberAvatar member={member} members={members} size={24} />
                      <span className="truncate text-body font-medium text-ink" title={member.name}>
                        {shortName(member.name)}
                      </span>
                    </span>
                  )}
                  {split === "SHARES" && on && weightTotal > 0 && <span className="text-caption text-ink-muted">{formatCount(Math.round((weightOf(member) / weightTotal) * 1000) / 10, fmt)}%</span>}
                  {split === "EXACT" ? (
                    <Input size="sm" inputMode="decimal" value={exact[member.id] ?? ""} onChange={(event) => setExact({ ...exact, [member.id]: event.target.value.replace(/[^\d.]/g, "") })} placeholder="0" aria-label={t("{name}'s amount", { name: member.name })} frameClassName="w-28" className="text-right tabular-nums" />
                  ) : (
                    <span className="w-22.5 text-right text-body font-semibold text-ink">{on && value > 0 ? money(share) : "—"}</span>
                  )}
                </div>
              );
            })}
            <div className="-mt-px flex min-h-10 items-center gap-2.5 border-t border-divider bg-strip px-3 text-small font-semibold tabular-nums">
              <span className="flex-1">{t("Total")}</span>
              <span className={cn("w-22.5 text-right", split === "EXACT" && exactLeft !== 0 ? "text-warning" : "text-emerald")}>
                {split === "EXACT" ? money(exactTotal / 100) : value > 0 && sharers.length > 0 ? money(value) : "—"}
                {value > 0 && (split === "EXACT" ? exactLeft === 0 : sharers.length > 0) && " ✓"}
              </span>
            </div>
          </div>
        )}
        {noSharers && <span className="text-small font-semibold text-warning">{t("Tick at least one member to share it")}</span>}
        {noWeight && <span className="text-small font-semibold text-warning">{t("The members ticked have no cost share. Set the cost split in Members.")}</span>}
        {split === "EXACT" && value > 0 && exactLeft !== 0 && (
          <span className={cn("text-small font-semibold", exactLeft > 0 ? "text-warning" : "text-expense")}>{exactLeft > 0 ? t("{amount} still to give out", { amount: money(exactLeft / 100) }) : t("{amount} more than the expense", { amount: money(-exactLeft / 100) })}</span>
        )}
        {categoryDefault && <span className="text-caption text-ink-muted">{categoryDefault}</span>}
      </fieldset>

      <div className="flex flex-col gap-1.5 rounded-[14px] border border-line bg-strip px-3.5 py-3 text-small tabular-nums">
        <span className="text-caption font-semibold text-ink-muted">{t("Effect on {month} balances", { month: monthLabel })}</span>
        {!fromFund && payer && value > 0 && (
          <div className="flex flex-wrap justify-between gap-x-3">
            <span className="text-ink-2">{t("{name} · paid {amount}, share {share}", { name: shortName(payer.name), amount: money(value), share: money(payerShare) })}</span>
            <b className={cn("font-bold", value - payerShare < 0 ? "text-expense" : "text-income")}>{formatSignedCurrency(value - payerShare, currency, fmt)}</b>
          </div>
        )}
        {value > 0 && parts.length > 0 && others.length > 0 && others.length <= 3 ? (
          <div className="flex flex-wrap justify-between gap-x-3">
            <span className="text-ink-2">{others.map((part) => t("{name} · share {amount}", { name: shortName(part.member.name), amount: money(part.share) })).join(" · ")}</span>
            <b className="font-bold text-expense">{others.map((part) => formatSignedCurrency(-part.share, currency, fmt)).join(" · ")}</b>
          </div>
        ) : split === "EQUAL" || mealsEqual ? (
          <div className="flex flex-wrap justify-between gap-x-3">
            <span className="text-ink-2">{countLabel(t, fmt, equalCount, "Shared equally · ÷ {count} member", "Shared equally · ÷ {count} members")}</span>
            <b className="font-bold text-expense">{value > 0 && equalCount > 0 ? t("− {amount} each", { amount: money(each) }) : "—"}</b>
          </div>
        ) : (
          <div className="flex flex-wrap justify-between gap-x-3">
            <span className="text-ink-2">{t(splitWord)}</span>
            <b className="font-bold text-expense">{value > 0 ? `− ${money(value)}` : "—"}</b>
          </div>
        )}
      </div>

      {tried && !valid && <p className="text-small font-semibold text-expense">{t("Fill in date, category, amount and who paid.")}</p>}
    </GroupDialog>
  );
}
