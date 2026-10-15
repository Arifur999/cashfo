"use client";

import { CalendarDays, Info, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { GroupExpense, GroupExpenseCategoryOption, GroupMember } from "@/lib/customer/api";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import type { MonthRange } from "@/lib/customer/groupDisplay";
import { createGroupExpenseAction, updateGroupExpenseAction } from "@/lib/customer/groupExpensesActions";
import { monthName } from "@/lib/customer/insights";
import { normalizeMoneyInput } from "@/lib/customer/money";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { dayInMonth } from "./ContributionDrawer";
import { MemberPicker } from "./MemberPicker";

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
}

// An expense paid from the group fund, in the design's drawer: how much
// and when, the category and what it was, who handed the money over, and
// what it does to each member's share.
export function ExpenseDrawer({ open, onClose, businessId, currency, members, categories, cashInHand, range, today, editing }: ExpenseDrawerProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const active = members.filter((member) => member.status === "ACTIVE");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [paidById, setPaidById] = useState("");
  const [isPending, startTransition] = useTransition();

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
    }
  }

  const value = Number(amount) || 0;
  const previous = editing ? Number(editing.amount) : 0;
  const delta = value - previous;
  const chosen = categories.find((c) => c.name === category);
  const tone = categoryTone(chosen?.color);
  const each = active.length > 0 ? value / active.length : 0;
  const valid = value > 0 && date.length > 0;
  const monthLabel = monthName(range.key, locale);

  function save(addAnother: boolean) {
    if (!valid || isPending) return;
    startTransition(async () => {
      const input = { amount: String(value), date, category: category || undefined, description: description.trim() || undefined, paidByMemberId: paidById || undefined };
      const result = editing ? await updateGroupExpenseAction(businessId, editing.id, { ...input, description: description.trim() }) : await createGroupExpenseAction(businessId, input);
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
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-130 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-130" : "h-[92vh] rounded-t-xl")}>
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
                  value={amount}
                  onChange={(event) => setAmount(normalizeMoneyInput(event.target.value))}
                  autoFocus
                  placeholder="0"
                  className="text-h3 font-bold tabular-nums"
                  leading={<span className="flex h-12 w-10 items-center justify-center border-r border-line bg-cream text-title font-semibold text-ink-2">{currencySymbol(currency)}</span>}
                  frameClassName="overflow-hidden pl-0"
                />
              </Field>
              <Field htmlFor="exp-date" label={label(t("Date"))}>
                <Input id="exp-date" type="date" size="lg" value={date} onChange={(event) => setDate(event.target.value)} max={today} leading={<CalendarDays />} className="px-0" frameClassName="px-3" />
              </Field>
            </div>

            <div className="grid grid-cols-[200px_minmax(0,1fr)] gap-3">
              <Field htmlFor="exp-category" label={label(t("Category"))} hint={categories.length === 0 ? t("Add categories under Settings.") : undefined}>
                <span className="relative flex items-center">
                  <span className={cn("pointer-events-none absolute left-3 flex size-6.5 items-center justify-center rounded-sm [&_svg]:size-3.5", tone.bg, tone.fg)}>{chosen?.icon ? createElement(budgetCategoryIcon(chosen.icon), { "aria-hidden": true }) : null}</span>
                  <NativeSelect id="exp-category" size="md" value={category} onChange={(event) => setCategory(event.target.value)} frameClassName="w-full" className="pl-12 font-semibold">
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

            <Field htmlFor="exp-paid" label={label(t("Handed over by"), true)} hint={t("For the record only: every expense is paid from the group fund, so nobody is credited.")}>
              <div className="flex items-center gap-2">
                <MemberPicker id="exp-paid" members={active} value={paidById} onChange={setPaidById} currency={currency} size="md" placeholder={t("Anyone")} />
                {paidById && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPaidById("")}>
                    {t("Clear")}
                  </Button>
                )}
              </div>
            </Field>

            <div className="flex flex-col gap-2 rounded-md border border-line bg-cream px-4 py-3 text-small tabular-nums">
              <span className="text-caption font-semibold text-ink-muted">
                {t("Effect on")} {monthLabel} {t("balances")}
              </span>
              <div className="flex justify-between gap-3">
                <span className="text-ink-2">
                  {t("Shared equally")} · ÷ {active.length} {t(active.length === 1 ? "member" : "members")}
                </span>
                <b className="font-bold text-expense">{value > 0 && active.length > 0 ? `− ${formatCurrency(each, currency)} ${t("each")}` : "—"}</b>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink-2">{t("Cash in hand")}</span>
                <span>
                  <span className="text-ink-muted">{formatCurrency(cashInHand, currency)} → </span>
                  <b className={cn("font-bold", cashInHand - delta < 0 ? "text-expense" : "text-ink")}>{formatCurrency(cashInHand - delta, currency)}</b>
                </span>
              </div>
              {cashInHand - delta < 0 && value > 0 && (
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
