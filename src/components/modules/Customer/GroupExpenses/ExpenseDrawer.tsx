"use client";

import { Check, Info, User, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/modules/Customer/Books/shared/Drawer";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { useAmountField } from "@/hooks/useAmountField";
import type { GroupExpense, GroupExpenseCategoryOption, GroupMember, GroupPaidFrom, GroupSplit } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { currencySymbol, formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { countLabel, type MonthRange, shortName, SPLIT_LABELS, SPLITS } from "@/lib/customer/groupDisplay";
import { createGroupExpenseAction, updateGroupExpenseAction } from "@/lib/customer/groupExpensesActions";
import { mealText } from "@/lib/customer/groupMeals";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { dayInMonth } from "./ContributionDrawer";
import { FOCUS_WITHIN, MemberAvatar } from "./GroupBits";
import type { ClosedGuard } from "./groupTypes";
import { MemberPicker } from "./MemberPicker";
import { ShareStepper } from "./ShareStepper";

interface ExpenseDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  members: GroupMember[];
  categories: GroupExpenseCategoryOption[];
  cashInHand: number;
  range: MonthRange;
  today: string;
  editing: GroupExpense | null;
  // Whether "By meals" is offered (a mess, or meal counting on).
  meals: boolean;
  // Whether meals are counted: while they aren't, a by-meals cost is shared
  // equally.
  mealsOn: boolean;
  // Who keeps the group's cash, by their short name.
  holderName?: string;
  closedGuard: ClosedGuard;
}

const paisa = (value: number | string) => Math.round(Number(value) * 100);

// An expense in the design's drawer: how much and when, the category and
// what it was, whether it came from the group fund or someone's own pocket
// (credited to them), how it is shared -- equally among everyone or the
// members picked, by shares, by meals, or by exact amounts -- and what it
// does to each member's share.
export function ExpenseDrawer({ open, onClose, businessId, currency, members, categories, cashInHand, range, today, editing, meals, mealsOn, holderName, closedGuard }: ExpenseDrawerProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const active = members.filter((member) => member.status === "ACTIVE");
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
  const [units, setUnits] = useState<Record<string, number>>({});
  const [exact, setExact] = useState<Record<string, string>>({});
  // A closed month was asked about once already while it is open.
  const [closedOk, setClosedOk] = useState(false);
  const [isPending, startTransition] = useTransition();
  const defaultUnits = Object.fromEntries(active.map((member) => [member.id, Number(member.shareUnits)]));

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setAmount(editing ? String(Number(editing.amount)) : "");
      setDate(editing ? editing.date.slice(0, 10) : dayInMonth(range, today));
      setCategory(editing?.category ?? categories[0]?.name ?? "");
      setDescription(editing?.description ?? "");
      setPaidById(editing?.paidByMemberId ?? "");
      setPaidFrom(editing?.paidFrom ?? "FUND");
      const startCategory = editing?.category ?? categories[0]?.name ?? "";
      setSplit(editing?.split ?? categories.find((c) => c.name === startCategory)?.defaultSplit ?? "EQUAL");
      setSplitTouched(!!editing);
      const named = editing?.splits ?? [];
      setIncluded(named.length > 0 ? named.map((s) => s.groupMemberId) : active.map((m) => m.id));
      setUnits({ ...defaultUnits, ...Object.fromEntries(named.filter((s) => s.units !== null).map((s) => [s.groupMemberId, Number(s.units)])) });
      setExact(Object.fromEntries(named.filter((s) => s.amount !== null).map((s) => [s.groupMemberId, String(Number(s.amount))])));
      setClosedOk(false);
    }
  }

  function pickCategory(name: string) {
    setCategory(name);
    const fallback = categories.find((c) => c.name === name)?.defaultSplit;
    if (!splitTouched && fallback) setSplit(fallback);
  }

  const toggle = (id: string) => setIncluded(included.includes(id) ? included.filter((x) => x !== id) : [...included, id]);

  const value = Number(amount) || 0;
  // The fund gives back what the saved entry took from it, and pays this one if it is the fund's.
  const previousFund = editing && editing.paidFrom !== "MEMBER" ? Number(editing.amount) : 0;
  const chosen = categories.find((c) => c.name === category);
  const tone = categoryTone(chosen?.color);
  const sharers = active.filter((member) => included.includes(member.id));
  // By meals with meal counting off: everyone shares it equally for now.
  const mealsEqual = split === "MEALS" && !mealsOn;
  const equalCount = mealsEqual ? active.length : sharers.length;
  const each = equalCount > 0 ? value / equalCount : 0;
  const unitTotal = sharers.reduce((sum, member) => sum + (units[member.id] ?? 1), 0);
  const exactTotal = active.reduce((sum, member) => sum + paisa(exact[member.id] || 0), 0);
  const exactLeft = paisa(value) - exactTotal;
  const everyone = sharers.length === active.length;
  const fromFund = paidFrom === "FUND";
  const cashAfter = cashInHand + previousFund - (fromFund ? value : 0);
  const payer = members.find((member) => member.id === paidById);
  // What keeps Save off, said where it is fixed.
  const noPocket = !fromFund && !paidById;
  const noSharers = split !== "MEALS" && split !== "EXACT" && sharers.length === 0;
  const valid = value > 0 && date.length > 0 && !noPocket && (split === "MEALS" || (split === "EXACT" ? exactLeft === 0 && exactTotal > 0 : sharers.length > 0));
  const monthLabel = monthName(range.key, fmt);
  // What the splits say: none when everyone in the group shares the plain way.
  const splits =
    split === "EXACT"
      ? active.filter((member) => paisa(exact[member.id] || 0) > 0).map((member) => ({ groupMemberId: member.id, amount: String(Number(exact[member.id])) }))
      : split === "SHARES"
        ? everyone && sharers.every((member) => (units[member.id] ?? 1) === defaultUnits[member.id])
          ? []
          : sharers.map((member) => ({ groupMemberId: member.id, units: units[member.id] ?? 1 }))
        : split === "EQUAL" && !everyone
          ? sharers.map((member) => ({ groupMemberId: member.id }))
          : [];

  async function save(addAnother: boolean) {
    if (!valid || isPending) return;
    // A new expense (or one moved to another day) inside a closed month:
    // ask first. An edit was asked about when it was opened.
    const moved = !editing || editing.date.slice(0, 10) !== date;
    if (moved && closedGuard.isClosed(date) && !closedOk) {
      if (!(await closedGuard.ask(date))) return;
      setClosedOk(true);
    }
    startTransition(async () => {
      const input = { amount: String(value), date, category: category || undefined, description: description.trim() || undefined, paidByMemberId: paidById || undefined, paidFrom, split, splits };
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

  // Each member's part of this expense as it stands, where the drawer can
  // tell (a by-meals cost waits for the month's meal rate).
  const shareOf = (id: string): number | null => {
    if (split === "MEALS" && !mealsEqual) return null;
    if (split === "EXACT") return Number(exact[id] || 0);
    if (split === "SHARES") return included.includes(id) ? (value * (units[id] ?? 1)) / (unitTotal || 1) : 0;
    return mealsEqual || included.includes(id) ? each : 0;
  };
  const money = (amount: number) => formatCurrency(amount, currency, fmt);
  const parts = active.map((member) => ({ member, share: shareOf(member.id) })).filter((part): part is { member: GroupMember; share: number } => part.share !== null && part.share > 0.004);
  const payerShare = payer ? (shareOf(payer.id) ?? 0) : 0;
  const others = parts.filter((part) => fromFund || part.member.id !== payer?.id);
  const splitChoices = SPLITS.filter((option) => option !== "MEALS" || meals || split === "MEALS");
  // What the category does by default, said under the members.
  const categoryDefault = chosen && chosen.defaultSplit === split && split !== "EQUAL" ? t("{category} is shared {how} by default. You can change it for this one expense.", { category: chosen.name, how: t(SPLIT_LABELS[split]).toLowerCase() }) : null;

  return (
    <Drawer
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
            <Button type="button" variant="secondary" onClick={() => void save(true)} disabled={!valid || isPending} className="mr-auto max-sm:flex-1">
              {t("Save & add another")}
            </Button>
          )}
          {/* Below md the X closes the sheet. */}
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending} className="hidden px-3.5 md:inline-flex">
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={!valid || isPending} className="px-4.5 max-sm:flex-1">
            {isPending && <Loader />}
            {editing ? t("Save changes") : t("Save expense")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[minmax(0,1fr)_160px] gap-2.5">
          <Field htmlFor="exp-amount" label={label(t("Amount"))}>
            <Input
              id="exp-amount"
              size="lg"
              inputMode="decimal"
              {...amountField}
              autoFocus
              placeholder="0"
              className="text-h3 font-bold tabular-nums"
              leading={<span className="flex h-12 w-10 items-center justify-center border-r border-line bg-strip text-[17px] font-semibold text-ink-soft">{currencySymbol(currency)}</span>}
              frameClassName="overflow-hidden pl-0"
            />
          </Field>
          <Field htmlFor="exp-date" label={label(t("Date"))}>
            <DayInput id="exp-date" size="lg" value={date} onChange={setDate} max={today} />
          </Field>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-[200px_minmax(0,1fr)]">
          <Field htmlFor="exp-category" label={label(t("Category"))} hint={categories.length === 0 ? t("Add categories under Settings.") : undefined}>
            <span className="relative flex items-center">
              <span className={cn("pointer-events-none absolute left-2.5 z-1 flex size-6.5 items-center justify-center rounded-[7px] [&_svg]:size-3.5", tone.bg, tone.fg)}>{chosen?.icon ? createElement(budgetCategoryIcon(chosen.icon), { "aria-hidden": true }) : null}</span>
              <NativeSelect id="exp-category" size="md" value={category} onChange={(event) => pickCategory(event.target.value)} frameClassName="w-full" className="pl-11 font-semibold" aria-describedby={categories.length === 0 ? "exp-category-hint" : undefined}>
                {categories.length === 0 && <option value="">{t("No category")}</option>}
                {categories.map((option) => (
                  <option key={option.id} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </NativeSelect>
            </span>
          </Field>
          <Field htmlFor="exp-desc" label={label(t("Description"), true)}>
            <Input id="exp-desc" size="md" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={140} placeholder={t("Monthly grocery: rice, oil, dal")} />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-body leading-[normal] font-medium text-ink">{t("Paid from")}</legend>
          {/* Real radios under the cards: arrow keys move between them. */}
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "FUND", icon: Wallet, title: "Group fund", sub: holderName ? t("Cash {name} holds", { name: holderName }) : t("The group's cash") },
                { value: "MEMBER", icon: User, title: "Someone's own pocket", sub: t("They get it back as credit") },
              ] as const
            ).map((option) => {
              const on = paidFrom === option.value;
              return (
                <label key={option.value} className={cn("relative flex h-12.5 cursor-pointer items-center gap-2.5 rounded-field border px-3 text-left transition-colors", FOCUS_WITHIN, on ? "border-[1.5px] border-emerald bg-mint-50/60" : "border-line bg-surface hover:border-input")}>
                  <input type="radio" name="exp-paid-from" value={option.value} checked={on} onChange={() => setPaidFrom(option.value)} className="sr-only" />
                  <option.icon className={cn("size-4.5 shrink-0", on ? "text-emerald" : "text-ink-muted")} aria-hidden="true" />
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className={cn("truncate text-small font-semibold", on ? "text-brand-ink" : "text-ink")}>{t(option.title)}</span>
                    <span className={cn("truncate text-caption", on ? "text-emerald" : "text-ink-muted")}>{option.sub}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="grid items-center gap-2.5 sm:grid-cols-[200px_minmax(0,1fr)]">
            <div className="flex items-center gap-2">
              <MemberPicker id="exp-paid" label={t(fromFund ? "Handed over by" : "Whose pocket")} describedBy="exp-paid-note" members={active} value={paidById} onChange={setPaidById} currency={currency} size="md" placeholder={t(fromFund ? "Handed over by (optional)" : "Pick a member")} />
              {paidById && fromFund && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPaidById("")} className="px-2">
                  {t("Clear")}
                </Button>
              )}
            </div>
            <span id="exp-paid-note" className={cn("flex items-center gap-1.5 text-[12.5px] leading-snug", noPocket ? "font-semibold text-warning" : fromFund ? "text-ink-muted" : "text-brand-ink")}>
              {!fromFund && !noPocket && <Check className="size-3.75 shrink-0 text-emerald" strokeWidth={2.5} aria-hidden="true" />}
              {noPocket ? t("Pick whose pocket it came from") : fromFund ? t("For the record only: it came from the group fund, so nobody is credited.") : t("{name} is credited {amount}. The fund's cash stays the same.", { name: shortName(payer?.name), amount: money(value) })}
            </span>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-body leading-[normal] font-medium text-ink">{t("How is it shared?")}</legend>
          <SegmentedControl<GroupSplit>
            options={splitChoices.map((option) => ({ value: option, label: SPLIT_LABELS[option] }))}
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
                return (
                  <div key={member.id} className="flex min-h-11 items-center gap-2.5 border-b border-divider px-3 py-1 tabular-nums">
                    {split !== "EXACT" ? (
                      // A real checkbox under the box: the name is its label.
                      <label className={cn("flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-sm text-left", FOCUS_WITHIN)}>
                        <input type="checkbox" checked={on} onChange={() => toggle(member.id)} className="sr-only" />
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
                    {split === "SHARES" && on && <ShareStepper size="sm" value={units[member.id] ?? 1} onChange={(next) => setUnits({ ...units, [member.id]: next })} name={member.name} />}
                    {split === "EXACT" ? (
                      <Input size="sm" inputMode="decimal" value={exact[member.id] ?? ""} onChange={(event) => setExact({ ...exact, [member.id]: event.target.value.replace(/[^\d.]/g, "") })} placeholder="0" aria-label={t("{name}'s amount", { name: member.name })} frameClassName="w-28" className="text-right tabular-nums" />
                    ) : (
                      <span className="w-22.5 text-right text-body font-semibold text-ink">{on && value > 0 ? money(split === "SHARES" ? (value * (units[member.id] ?? 1)) / (unitTotal || 1) : each) : "—"}</span>
                    )}
                  </div>
                );
              })}
              {/* What the shares come to: the units, and the amount when it all adds up. */}
              <div className="-mt-px flex min-h-10 items-center gap-2.5 border-t border-divider bg-strip px-3 text-small font-semibold tabular-nums">
                <span className="flex-1">{t("Total")}</span>
                {split === "SHARES" && <span className="text-ink-soft">{t("{count} shares", { count: mealText(unitTotal, fmt) })}</span>}
                <span className={cn("w-22.5 text-right", split === "EXACT" && exactLeft !== 0 ? "text-warning" : "text-emerald")}>
                  {split === "EXACT" ? money(exactTotal / 100) : value > 0 && sharers.length > 0 ? money(value) : "—"}
                  {value > 0 && (split === "EXACT" ? exactLeft === 0 : sharers.length > 0) && " ✓"}
                </span>
              </div>
            </div>
          )}
          {noSharers && <span className="text-small font-semibold text-warning">{t("Tick at least one member to share it")}</span>}
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
              <span className="text-ink-2">{t(SPLIT_LABELS[split])}</span>
              <b className="font-bold text-expense">{value > 0 ? `− ${money(value)}` : "—"}</b>
            </div>
          )}
          {fromFund && (
            <div className="flex flex-wrap justify-between gap-x-3">
              <span className="text-ink-2">{t("Cash in hand")}</span>
              <span>
                <span className="text-ink-muted">{money(cashInHand)} → </span>
                <b className={cn("font-bold", cashAfter < 0 ? "text-expense" : "text-ink")}>{money(cashAfter)}</b>
              </span>
            </div>
          )}
          {fromFund && cashAfter < 0 && value > 0 && (
            <span className="flex items-start gap-2 text-caption font-normal text-warning">
              <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              {t("More is being spent than the fund holds. Record the contributions that covered it.")}
            </span>
          )}
        </div>
      </div>
    </Drawer>
  );
}
