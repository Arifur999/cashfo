"use client";

import { Info, Minus, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAmountField } from "@/hooks/useAmountField";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { GroupExpense, GroupExpenseCategoryOption, GroupMember, GroupPaidFrom, GroupSplit } from "@/lib/customer/api";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { type MonthRange, SPLIT_LABELS, SPLITS } from "@/lib/customer/groupDisplay";
import { mealText } from "@/lib/customer/groupMeals";
import { createGroupExpenseAction, updateGroupExpenseAction } from "@/lib/customer/groupExpensesActions";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { dayInMonth } from "./ContributionDrawer";
import { MemberPicker } from "./MemberPicker";
import DayInput from "@/components/smartly/form/DayInput";

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
}

const paisa = (value: number | string) => Math.round(Number(value) * 100);

// An expense in the design's drawer: how much and when, the category and
// what it was, whether it came from the group fund or someone's own pocket
// (credited to them), how it is shared -- equally among everyone or the
// members picked, by shares, by meals, or by exact amounts -- and what it
// does to each member's share.
export function ExpenseDrawer({ open, onClose, businessId, currency, members, categories, cashInHand, range, today, editing, meals }: ExpenseDrawerProps) {
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
  const each = sharers.length > 0 ? value / sharers.length : 0;
  const unitTotal = sharers.reduce((sum, member) => sum + (units[member.id] ?? 1), 0);
  const exactTotal = active.reduce((sum, member) => sum + paisa(exact[member.id] || 0), 0);
  const exactLeft = paisa(value) - exactTotal;
  const everyone = sharers.length === active.length;
  const fromFund = paidFrom === "FUND";
  const cashAfter = cashInHand + previousFund - (fromFund ? value : 0);
  const payer = members.find((member) => member.id === paidById);
  const valid = value > 0 && date.length > 0 && (fromFund || !!paidById) && (split === "MEALS" || (split === "EXACT" ? exactLeft === 0 && exactTotal > 0 : sharers.length > 0));
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

  function save(addAnother: boolean) {
    if (!valid || isPending) return;
    startTransition(async () => {
      const input = { amount: String(value), date, category: category || undefined, description: description.trim() || undefined, paidByMemberId: paidById || undefined, paidFrom, split, splits };
      const result = editing ? await updateGroupExpenseAction(businessId, editing.id, { ...input, description: description.trim(), paidByMemberId: paidById }) : await createGroupExpenseAction(businessId, input);
      if (!result.success) {
        toast.error(result.message ?? t("Failed to save the expense"));
        return;
      }
      toast.success(editing ? t("Expense updated") : t("Expense recorded"));
      router.refresh();
      if (addAnother) {
        setAmount("");
        setDescription("");
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
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-130 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-130" : "rounded-t-xl data-[side=bottom]:h-[92vh]")}>
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-4" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="text-h3 text-ink">{editing ? t("Edit expense") : t("Add expense")}</SheetTitle>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            save(false);
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
                  leading={<span className="flex h-12 w-10 items-center justify-center border-r border-line bg-cream text-title font-semibold text-ink-2">{currencySymbol(currency)}</span>}
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
                  <NativeSelect id="exp-category" size="md" value={category} onChange={(event) => pickCategory(event.target.value)} frameClassName="w-full" className="pl-12 font-semibold">
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
            <Field htmlFor="exp-paid" label={label(t(fromFund ? "Handed over by" : "Whose pocket"), fromFund)} hint={fromFund ? t("For the record only: it came from the group fund, so nobody is credited.") : t("Credited to them: their balance goes up by the amount.")}>
              <div className="flex items-center gap-2">
                <MemberPicker id="exp-paid" members={active} value={paidById} onChange={setPaidById} currency={currency} size="md" placeholder={t(fromFund ? "Anyone" : "Pick a member")} />
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
                <span className="text-small text-ink-muted">{t("Shared by the meals each member eats this month, at the month's meal rate.")}</span>
              ) : (
                <div className="flex flex-col overflow-hidden rounded-md border border-line">
                  {active.map((member) => {
                    const on = included.includes(member.id);
                    return (
                      <div key={member.id} className="flex h-12 items-center gap-3 border-b border-surface-sunken px-3 last:border-b-0">
                        {split !== "EXACT" ? (
                          <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(member.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                            <span aria-hidden="true" className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border text-[11px] font-bold", on ? "border-emerald bg-emerald text-white" : "border-line-strong bg-surface")}>
                              {on ? "✓" : ""}
                            </span>
                            <PersonAvatar name={member.name} src={member.photoUrl} size={26} coloured />
                            <span className={cn("truncate text-body font-medium", on ? "text-ink" : "text-ink-muted")}>{member.name}</span>
                          </button>
                        ) : (
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <PersonAvatar name={member.name} src={member.photoUrl} size={26} coloured />
                            <span className="truncate text-body font-medium text-ink">{member.name}</span>
                          </span>
                        )}
                        {split === "SHARES" && on && (
                          <span className="flex h-8 items-center overflow-hidden rounded-md border border-line-strong">
                            <button type="button" aria-label={t("Fewer shares for {name}", { name: member.name })} disabled={(units[member.id] ?? 1) <= 0.5} onClick={() => setUnits({ ...units, [member.id]: Math.max(0.5, (units[member.id] ?? 1) - ((units[member.id] ?? 1) > 1 ? 1 : 0.5)) })} className="flex h-full w-7 items-center justify-center bg-cream disabled:opacity-40">
                              <Minus className="size-3.5" aria-hidden="true" />
                            </button>
                            <span className="w-8 text-center text-body font-bold tabular-nums">{mealText(units[member.id] ?? 1)}</span>
                            <button type="button" aria-label={t("More shares for {name}", { name: member.name })} onClick={() => setUnits({ ...units, [member.id]: (units[member.id] ?? 1) < 1 ? 1 : (units[member.id] ?? 1) + 1 })} className="flex h-full w-7 items-center justify-center bg-cream">
                              <Plus className="size-3.5" aria-hidden="true" />
                            </button>
                          </span>
                        )}
                        {split === "EXACT" ? (
                          <Input size="sm" inputMode="decimal" value={exact[member.id] ?? ""} onChange={(event) => setExact({ ...exact, [member.id]: event.target.value.replace(/[^\d.]/g, "") })} placeholder="0" aria-label={t("{name}'s amount", { name: member.name })} frameClassName="w-28" className="text-right tabular-nums" />
                        ) : (
                          <span className="w-24 text-right text-small font-semibold text-ink-2 tabular-nums">{on && value > 0 ? formatCurrency(split === "SHARES" ? (value * (units[member.id] ?? 1)) / (unitTotal || 1) : each, currency) : "—"}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {split === "EXACT" && value > 0 && exactLeft !== 0 && (
                <span className={cn("text-small font-semibold", exactLeft > 0 ? "text-warning" : "text-expense")}>{exactLeft > 0 ? t("{amount} still to give out", { amount: formatCurrency(exactLeft / 100, currency) }) : t("{amount} more than the expense", { amount: formatCurrency(-exactLeft / 100, currency) })}</span>
              )}
            </fieldset>

            <div className="flex flex-col gap-2 rounded-md border border-line bg-cream px-4 py-3 text-small tabular-nums">
              <span className="text-caption font-semibold text-ink-muted">
                {t("Effect on")} {monthLabel} {t("balances")}
              </span>
              {split === "EQUAL" && (
                <div className="flex justify-between gap-3">
                  <span className="text-ink-2">
                    {t("Shared equally")} · ÷ {sharers.length} {t(sharers.length === 1 ? "member" : "members")}
                  </span>
                  <b className="font-bold text-expense">{value > 0 && sharers.length > 0 ? `− ${formatCurrency(each, currency)} ${t("each")}` : "—"}</b>
                </div>
              )}
              {split !== "EQUAL" && (
                <div className="flex justify-between gap-3">
                  <span className="text-ink-2">{t(SPLIT_LABELS[split])}</span>
                  <b className="font-bold text-expense">{value > 0 ? `− ${formatCurrency(value, currency)}` : "—"}</b>
                </div>
              )}
              {!fromFund && payer && value > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="text-ink-2">{t("Credited to {name}", { name: payer.name })}</span>
                  <b className="font-bold text-income">+ {formatCurrency(value, currency)}</b>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <span className="text-ink-2">{t("Cash in hand")}</span>
                <span>
                  <span className="text-ink-muted">{formatCurrency(cashInHand, currency)} → </span>
                  <b className={cn("font-bold", cashAfter < 0 ? "text-expense" : "text-ink")}>{formatCurrency(cashAfter, currency)}</b>
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

          <div className={cn("flex items-center gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 py-3")}>
            {!editing && (
              <Button type="button" variant="secondary" onClick={() => save(true)} disabled={!valid || isPending}>
                {t("Save & add another")}
              </Button>
            )}
            <span className="flex-1" />
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader />}
              {editing ? t("Save changes") : t("Save expense")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
