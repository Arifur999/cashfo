"use client";

import { Check, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAmountField } from "@/hooks/useAmountField";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { GroupExpense, GroupExpenseCategoryOption, GroupMember, GroupPaidFrom, GroupSplit } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { countLabel, type MonthRange, SPLIT_LABELS, SPLITS } from "@/lib/customer/groupDisplay";
import { createGroupExpenseAction, updateGroupExpenseAction } from "@/lib/customer/groupExpensesActions";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { dayInMonth } from "./ContributionDrawer";
import { CloseX, FOCUS_WITHIN } from "./GroupBits";
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
  closedGuard: ClosedGuard;
}

const paisa = (value: number | string) => Math.round(Number(value) * 100);

// An expense in the design's drawer: how much and when, the category and
// what it was, whether it came from the group fund or someone's own pocket
// (credited to them), how it is shared -- equally among everyone or the
// members picked, by shares, by meals, or by exact amounts -- and what it
// does to each member's share.
export function ExpenseDrawer({ open, onClose, businessId, currency, members, categories, cashInHand, range, today, editing, meals, mealsOn, closedGuard }: ExpenseDrawerProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
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
  const monthLabel = monthName(range.key, locale);
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

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-130 shadow-drawer data-[side=right]:sm:max-w-130" : "rounded-t-xl data-[side=bottom]:h-[92vh]")}>
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-4" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="text-h3 text-ink">{editing ? t("Edit expense") : t("Add expense")}</SheetTitle>
          <CloseX onClick={onClose} disabled={isPending} />
        </SheetHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save(false);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-4" : "px-4 py-3")}>
            <div className="grid grid-cols-[minmax(0,1fr)_160px] gap-3">
              <Field htmlFor="exp-amount" label={label(t("Amount"))}>
                <Input
                  id="exp-amount"
                  size="lg"
                  inputMode="decimal"
                  {...amountField}
                  autoFocus
                  placeholder="0"
                  className="text-h3 font-bold tabular-nums"
                  leading={<span className="flex h-12 w-10 items-center justify-center border-r border-line bg-strip text-title font-semibold text-ink-2">{currencySymbol(currency)}</span>}
                  frameClassName="overflow-hidden pl-0"
                />
              </Field>
              <Field htmlFor="exp-date" label={label(t("Date"))}>
                <DayInput id="exp-date" size="lg" value={date} onChange={setDate} max={today} />
              </Field>
            </div>

            <div className="grid grid-cols-[200px_minmax(0,1fr)] gap-3">
              <Field htmlFor="exp-category" label={label(t("Category"))} hint={categories.length === 0 ? t("Add categories under Settings.") : undefined}>
                <span className="relative flex items-center">
                  <span className={cn("pointer-events-none absolute left-3 flex size-6.5 items-center justify-center rounded-sm [&_svg]:size-3.5", tone.bg, tone.fg)}>{chosen?.icon ? createElement(budgetCategoryIcon(chosen.icon), { "aria-hidden": true }) : null}</span>
                  <NativeSelect id="exp-category" size="md" value={category} onChange={(event) => pickCategory(event.target.value)} frameClassName="w-full" className="pl-12 font-semibold" aria-describedby={categories.length === 0 ? "exp-category-hint" : undefined}>
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
              <legend className="mb-2 text-body leading-[normal] font-medium text-ink">{t("Paid from")}</legend>
              <SegmentedControl<GroupPaidFrom>
                options={[
                  { value: "FUND", label: "Group fund" },
                  { value: "MEMBER", label: "Someone's own pocket" },
                ]}
                value={paidFrom}
                onChange={setPaidFrom}
                label="Paid from"
                stretch
                className="[&>button]:h-8.5"
              />
            </fieldset>
            <Field
              htmlFor="exp-paid"
              label={label(t(fromFund ? "Handed over by" : "Whose pocket"), fromFund)}
              hint={noPocket ? <span className="font-semibold text-warning">{t("Pick whose pocket it came from")}</span> : fromFund ? t("For the record only: it came from the group fund, so nobody is credited.") : t("Credited to them: their balance goes up by the amount.")}
            >
              <div className="flex items-center gap-2">
                <MemberPicker id="exp-paid" label={t(fromFund ? "Handed over by" : "Whose pocket")} describedBy="exp-paid-hint" members={active} value={paidById} onChange={setPaidById} currency={currency} size="md" placeholder={t(fromFund ? "Anyone" : "Pick a member")} />
                {paidById && fromFund && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPaidById("")}>
                    {t("Clear")}
                  </Button>
                )}
              </div>
            </Field>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-body leading-[normal] font-medium text-ink">{t("How is it shared?")}</legend>
              <SegmentedControl<GroupSplit>
                options={SPLITS.filter((option) => option !== "MEALS" || meals || split === "MEALS").map((option) => ({ value: option, label: SPLIT_LABELS[option] }))}
                value={split}
                onChange={(next) => {
                  setSplit(next);
                  setSplitTouched(true);
                }}
                label="How is it shared?"
                stretch
                className="[&>button]:h-8.5 [&>button]:px-2"
              />
              {split === "MEALS" ? (
                <span className="text-small text-ink-muted">{mealsOn ? t("Shared by the meals each member eats this month, at the month's meal rate.") : t("Meal counting is off, so this is shared equally among everyone for now.")}</span>
              ) : (
                <div className="flex flex-col overflow-hidden rounded-md border border-line">
                  {active.map((member) => {
                    const on = included.includes(member.id);
                    return (
                      <div key={member.id} className="flex min-h-12 items-center gap-3 border-b border-divider px-3 py-1.5 last:border-b-0">
                        {split !== "EXACT" ? (
                          // A real checkbox under the box: the name is its label.
                          <label className={cn("flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm text-left", FOCUS_WITHIN)}>
                            <input type="checkbox" checked={on} onChange={() => toggle(member.id)} className="sr-only" />
                            <span aria-hidden="true" className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border", on ? "border-emerald bg-emerald text-on-action" : "border-line-strong bg-surface")}>
                              {on && <Check className="size-3" strokeWidth={3} />}
                            </span>
                            <PersonAvatar name={member.name} src={member.photoUrl} size={26} coloured />
                            <span className={cn("truncate text-body font-medium", on ? "text-ink" : "text-ink-muted")}>{member.name}</span>
                          </label>
                        ) : (
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <PersonAvatar name={member.name} src={member.photoUrl} size={26} coloured />
                            <span className="truncate text-body font-medium text-ink">{member.name}</span>
                          </span>
                        )}
                        {split === "SHARES" && on && <ShareStepper size="sm" value={units[member.id] ?? 1} onChange={(next) => setUnits({ ...units, [member.id]: next })} name={member.name} />}
                        {split === "EXACT" ? (
                          <Input size="sm" inputMode="decimal" value={exact[member.id] ?? ""} onChange={(event) => setExact({ ...exact, [member.id]: event.target.value.replace(/[^\d.]/g, "") })} placeholder="0" aria-label={t("{name}'s amount", { name: member.name })} frameClassName="w-28" className="text-right tabular-nums" />
                        ) : (
                          <span className="w-24 text-right text-small font-semibold text-ink-2 tabular-nums">{on && value > 0 ? formatCurrency(split === "SHARES" ? (value * (units[member.id] ?? 1)) / (unitTotal || 1) : each, currency, locale) : "—"}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {noSharers && <span className="text-small font-semibold text-warning">{t("Tick at least one member to share it")}</span>}
              {split === "EXACT" && value > 0 && exactLeft !== 0 && (
                <span className={cn("text-small font-semibold", exactLeft > 0 ? "text-warning" : "text-expense")}>{exactLeft > 0 ? t("{amount} still to give out", { amount: formatCurrency(exactLeft / 100, currency, locale) }) : t("{amount} more than the expense", { amount: formatCurrency(-exactLeft / 100, currency, locale) })}</span>
              )}
            </fieldset>

            <div className="flex flex-col gap-2 rounded-md border border-line bg-strip px-4 py-3 text-small tabular-nums">
              <span className="text-caption font-semibold text-ink-muted">{t("Effect on {month} balances", { month: monthLabel })}</span>
              {split === "EQUAL" || mealsEqual ? (
                <div className="flex flex-wrap justify-between gap-x-3">
                  <span className="text-ink-2">{countLabel(t, locale, equalCount, "Shared equally · ÷ {count} member", "Shared equally · ÷ {count} members")}</span>
                  <b className="font-bold text-expense">{value > 0 && equalCount > 0 ? t("− {amount} each", { amount: formatCurrency(each, currency, locale) }) : "—"}</b>
                </div>
              ) : (
                <div className="flex flex-wrap justify-between gap-x-3">
                  <span className="text-ink-2">{t(SPLIT_LABELS[split])}</span>
                  <b className="font-bold text-expense">{value > 0 ? `− ${formatCurrency(value, currency, locale)}` : "—"}</b>
                </div>
              )}
              {!fromFund && payer && value > 0 && (
                <div className="flex flex-wrap justify-between gap-x-3">
                  <span className="text-ink-2">{t("Credited to {name}", { name: payer.name })}</span>
                  <b className="font-bold text-income">+ {formatCurrency(value, currency, locale)}</b>
                </div>
              )}
              <div className="flex flex-wrap justify-between gap-x-3">
                <span className="text-ink-2">{t("Cash in hand")}</span>
                <span>
                  <span className="text-ink-muted">{formatCurrency(cashInHand, currency, locale)} → </span>
                  <b className={cn("font-bold", cashAfter < 0 ? "text-expense" : "text-ink")}>{formatCurrency(cashAfter, currency, locale)}</b>
                </span>
              </div>
              {fromFund && cashAfter < 0 && value > 0 && (
                <span className="flex items-start gap-2 text-caption font-normal text-warning">
                  <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                  {t("More is being spent than the fund holds. Record the contributions that covered it.")}
                </span>
              )}
            </div>
          </div>

          <div className={cn("flex flex-wrap items-center gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 py-3")}>
            {!editing && (
              <Button type="button" variant="secondary" onClick={() => void save(true)} disabled={!valid || isPending} className="max-sm:w-full">
                {t("Save & add another")}
              </Button>
            )}
            <span className="flex-1 max-sm:hidden" />
            {/* Below md the X closes the sheet. */}
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="hidden md:inline-flex">
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || isPending} className="px-5 max-sm:w-full">
              {isPending && <Loader />}
              {editing ? t("Save changes") : t("Save expense")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
