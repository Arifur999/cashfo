"use client";

import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAmountField } from "@/hooks/useAmountField";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { GroupContribution, GroupMember } from "@/lib/customer/api";
import { currencySymbol, formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { groupMonthOf, type MonthRange, startDayOf } from "@/lib/customer/groupDisplay";
import { createGroupContributionAction, updateGroupContributionAction } from "@/lib/customer/groupExpensesActions";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { attempt } from "./attempt";
import { CloseX, FOCUS_WITHIN } from "./GroupBits";
import type { ClosedGuard } from "./groupTypes";
import { MemberPicker } from "./MemberPicker";

interface ContributionDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  members: GroupMember[];
  // The month's balance per member and the cash in hand, for the preview.
  balances: Record<string, number>;
  cashInHand: number;
  range: MonthRange;
  today: string;
  editing: GroupContribution | null;
  // Open with a member already chosen (from their row or statement).
  presetMemberId?: string | null;
  closedGuard: ClosedGuard;
}

type Kind = "DEPOSIT" | "RETURN";

// A day inside the month being viewed: today when it is in it, else the
// month's last day.
export function dayInMonth(range: MonthRange, today: string): string {
  return today >= range.from && today <= range.to ? today : range.to;
}

// Money a member hands to the fund, or the fund hands back, in the
// design's drawer: who, deposit or return, how much (with a chip that
// fills their dues), when and a note, with the balances after saving.
export function ContributionDrawer({ open, onClose, businessId, currency, members, balances, cashInHand, range, today, editing, presetMemberId = null, closedGuard }: ContributionDrawerProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const active = members.filter((member) => member.status === "ACTIVE" || member.id === editing?.groupMemberId);
  const [memberId, setMemberId] = useState("");
  const [kind, setKind] = useState<Kind>("DEPOSIT");
  const [amount, setAmount] = useState("");
  const amountField = useAmountField(amount, setAmount, currency);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  // A closed month was asked about once already while it is open.
  const [closedOk, setClosedOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? `create:${presetMemberId ?? ""}`) : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      const signed = Number(editing?.amount ?? 0);
      setMemberId(editing?.groupMemberId ?? presetMemberId ?? "");
      setKind(signed < 0 ? "RETURN" : "DEPOSIT");
      setAmount(editing ? String(Math.abs(signed)) : "");
      setDate(editing ? editing.date.slice(0, 10) : dayInMonth(range, today));
      setNote(editing?.note ?? "");
      setClosedOk(false);
    }
  }

  const value = Number(amount) || 0;
  const signed = kind === "RETURN" ? -value : value;
  // Editing moves the balance by the difference from what was saved.
  const previous = editing ? Number(editing.amount) : 0;
  const delta = signed - previous;
  const member = active.find((m) => m.id === memberId);
  const balance = balances[memberId] ?? 0;
  const dues = balance < 0 ? -balance : 0;
  const valid = memberId.length > 0 && value > 0 && date.length > 0;
  const monthLabel = monthName(range.key, locale);
  // The group month the day counts in: with months from the 10th, 5 Oct is September's.
  const countsIn = monthName(groupMonthOf(date || range.from, startDayOf(range)), locale);

  async function save(addAnother: boolean) {
    if (!valid || isPending) return;
    // A new entry (or one moved to another day) inside a closed month: ask
    // first. An edit was asked about when it was opened.
    const moved = !editing || editing.date.slice(0, 10) !== date;
    if (moved && closedGuard.isClosed(date) && !closedOk) {
      if (!(await closedGuard.ask(date))) return;
      setClosedOk(true);
    }
    startTransition(async () => {
      const input = { groupMemberId: memberId, amount: String(signed), date, note: note.trim() || undefined };
      const result = await attempt(() => (editing ? updateGroupContributionAction(businessId, editing.id, { ...input, note: note.trim() }) : createGroupContributionAction(businessId, input)), t("No connection. Nothing was saved; try again."));
      if (!result.success) {
        toast.error(result.message ?? t("Failed to save the contribution"));
        return;
      }
      toast.success(editing ? t("Contribution updated") : kind === "RETURN" ? t("Return recorded") : t("Contribution recorded"));
      router.refresh();
      if (addAnother) {
        setAmount("");
        setNote("");
        // Ready for the next one.
        document.getElementById("con-amount")?.focus();
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

  const kinds: { value: Kind; icon: React.ReactNode; title: string; sub: string }[] = [
    { value: "DEPOSIT", icon: <ArrowDownToLine aria-hidden="true" />, title: "Deposit", sub: "Member gives money" },
    { value: "RETURN", icon: <ArrowUpFromLine aria-hidden="true" />, title: "Return money", sub: "Fund pays back" },
  ];

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-115 shadow-drawer data-[side=right]:sm:max-w-115" : "rounded-t-xl data-[side=bottom]:h-[92vh]")}>
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="text-h3 text-ink">{editing ? t("Edit contribution") : t("Add contribution")}</SheetTitle>
          <CloseX onClick={onClose} disabled={isPending} />
        </SheetHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save(false);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <Field htmlFor="con-member" label={label(t("Member"))}>
              <MemberPicker id="con-member" label={t("Member")} members={active} value={memberId} onChange={setMemberId} currency={currency} balances={balances} />
            </Field>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body leading-[normal] font-medium text-ink">{t("Type")}</legend>
              {/* Real radios under the cards: arrow keys move between them. */}
              <div className="grid grid-cols-2 gap-2">
                {kinds.map((option) => {
                  const on = kind === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "relative flex h-13.5 cursor-pointer items-center gap-3 rounded-md border px-3 text-left transition-colors [&_svg]:size-5 [&_svg]:shrink-0",
                        FOCUS_WITHIN,
                        on ? (option.value === "DEPOSIT" ? "border-[1.5px] border-emerald bg-mint-50 text-emerald" : "border-[1.5px] border-expense bg-expense-soft text-expense") : "border-line bg-surface text-ink-muted hover:border-line-strong",
                      )}
                    >
                      <input type="radio" name="con-kind" value={option.value} checked={on} onChange={() => setKind(option.value)} className="sr-only" />
                      {option.icon}
                      <span className="flex min-w-0 flex-col gap-px">
                        <span className={cn("text-small", on ? "font-bold text-ink" : "font-semibold text-ink")}>{t(option.title)}</span>
                        <span className={cn("text-caption font-normal", on ? "text-current" : "text-ink-muted")}>{t(option.sub)}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid grid-cols-[minmax(0,1fr)_160px] gap-3">
              <Field htmlFor="con-amount" label={label(t("Amount"))}>
                <Input
                  id="con-amount"
                  size="lg"
                  inputMode="decimal"
                  {...amountField}
                  placeholder="0"
                  className="text-h3 font-bold tabular-nums"
                  leading={<span className="flex h-12 w-10 items-center justify-center border-r border-line bg-strip text-title font-semibold text-ink-2">{currencySymbol(currency)}</span>}
                  frameClassName="overflow-hidden pl-0"
                />
                {kind === "DEPOSIT" && dues > 0 && member && (
                  <button type="button" onClick={() => setAmount(String(dues))} className="mt-2 inline-flex h-6.5 items-center self-start rounded-full border border-mint-200 bg-mint-50 px-3 text-caption font-semibold text-brand-ink hover:bg-mint-200">
                    {t("Fill {month} dues · {amount}", { month: monthLabel, amount: formatCurrency(dues, currency) })}
                  </button>
                )}
              </Field>
              <Field htmlFor="con-date" label={label(t("Date"))} hint={t("Counts in {month}", { month: countsIn })}>
                <DayInput id="con-date" size="lg" value={date} onChange={setDate} max={today} />
              </Field>
            </div>

            <Field htmlFor="con-note" label={label(t("Note"), true)}>
              <Input id="con-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={140} placeholder={t("{month} dues, paid in cash", { month: monthLabel })} />
            </Field>

            {member && value > 0 && (
              <div className="flex flex-col gap-2 rounded-md border border-line bg-strip px-4 py-3 text-small tabular-nums">
                <span className="text-caption font-semibold text-ink-muted">{t("After saving")}</span>
                <div className="flex flex-wrap justify-between gap-x-3">
                  <span className="text-ink-2">{t("{name}'s {month} balance", { name: member.name, month: monthLabel })}</span>
                  <span>
                    <span className={balance < 0 ? "text-expense" : balance > 0 ? "text-income" : "text-ink-muted"}>{formatSignedCurrency(balance, currency)}</span>
                    <span className="text-ink-muted"> → </span>
                    <b className={cn("font-bold", balance + delta < -0.004 ? "text-expense" : balance + delta > 0.004 ? "text-income" : "text-ink")}>{Math.abs(balance + delta) < 0.005 ? `${formatCurrency(0, currency)} · ${t("settled")}` : formatSignedCurrency(balance + delta, currency)}</b>
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-x-3">
                  <span className="text-ink-2">{t("Cash in hand")}</span>
                  <span>
                    <span className="text-ink-muted">{formatCurrency(cashInHand, currency)} → </span>
                    <b className="font-bold text-ink">{formatCurrency(cashInHand + delta, currency)}</b>
                  </span>
                </div>
              </div>
            )}
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
              {editing ? t("Save changes") : t("Save")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
