"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { useAmountField } from "@/hooks/useAmountField";
import type { GroupContribution, GroupMember } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { currencySymbol, formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { groupMonthOf, type MonthRange, shortName, startDayOf } from "@/lib/customer/groupDisplay";
import { createGroupContributionAction, updateGroupContributionAction } from "@/lib/customer/groupExpensesActions";
import { accountantsOf } from "@/lib/customer/groupFamily";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { FOCUS_WITHIN } from "./GroupBits";
import { GroupDialog } from "./GroupDialog";
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
  // The accountant money goes to when nobody is picked.
  holderId: string | null;
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

// Money a member hands to an accountant, or an accountant hands back, in
// the v7 popup: when, how much (with a chip that fills their dues), who,
// which accountant it was given to, and a note, with the balances after
// saving.
export function ContributionDrawer({ open, onClose, businessId, currency, members, balances, cashInHand, holderId, range, today, editing, presetMemberId = null, closedGuard }: ContributionDrawerProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const active = members.filter((member) => member.status === "ACTIVE" || member.id === editing?.groupMemberId);
  const accountants = accountantsOf(members);
  const [memberId, setMemberId] = useState("");
  const [kind, setKind] = useState<Kind>("DEPOSIT");
  const [amount, setAmount] = useState("");
  const amountField = useAmountField(amount, setAmount, currency);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [givenTo, setGivenTo] = useState("");
  // A closed month was asked about once already while it is open.
  const [closedOk, setClosedOk] = useState(false);
  const [tried, setTried] = useState(false);
  const [isPending, startTransition] = useTransition();
  // A settle-up or a carried balance keeps its own kind; only its amount,
  // day and note change.
  const special = !!editing && (editing.kind === "SETTLE" || editing.kind === "CARRY");

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
      setGivenTo(editing ? (editing.receivedByMemberId ?? "") : (holderId ?? accountants[0]?.id ?? ""));
      setClosedOk(false);
      setTried(false);
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
  const monthLabel = monthName(range.key, fmt);
  // The group month the day counts in: with months from the 10th, 5 Oct is September's.
  const countsIn = monthName(groupMonthOf(date || range.from, startDayOf(range)), fmt);

  async function save(addAnother: boolean) {
    setTried(true);
    if (!valid || isPending) return;
    // A new entry (or one moved to another day) inside a closed month: ask
    // first. An edit was asked about when it was opened.
    const moved = !editing || editing.date.slice(0, 10) !== date;
    if (moved && closedGuard.isClosed(date) && !closedOk) {
      if (!(await closedGuard.ask(date))) return;
      setClosedOk(true);
    }
    startTransition(async () => {
      const amountText = special ? String(Math.sign(previous || 1) * value) : String(signed);
      const input = { groupMemberId: memberId, amount: amountText, date, note: note.trim() || undefined, ...(!special && accountants.length > 0 && { receivedByMemberId: givenTo || null }) };
      const result = await attempt(() => (editing ? updateGroupContributionAction(businessId, editing.id, { ...input, note: note.trim() }) : createGroupContributionAction(businessId, input)), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (!result.success) {
        toast.error(result.message ?? t("Failed to save the contribution"));
        return;
      }
      toast.success(editing ? t("Contribution updated") : kind === "RETURN" ? t("Return recorded") : t("Contribution recorded"));
      router.refresh();
      if (addAnother) {
        setAmount("");
        setNote("");
        setTried(false);
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
    { value: "DEPOSIT", icon: <ArrowDownLeft strokeWidth={2.25} aria-hidden="true" className="text-emerald" />, title: "Deposit", sub: "Member gives money" },
    { value: "RETURN", icon: <ArrowUpRight strokeWidth={2.25} aria-hidden="true" className="text-expense" />, title: "Return money", sub: "Accountant pays back" },
  ];

  return (
    <GroupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={460}
      title={editing ? t("Edit contribution") : t("Add contribution")}
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
            {editing ? t("Save changes") : t("Save")}
          </Button>
        </>
      }
    >
      {!special && (
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
                    on ? (option.value === "DEPOSIT" ? "border-[1.5px] border-emerald bg-mint-50/60 text-emerald" : "border-[1.5px] border-expense bg-expense-soft text-expense") : "border-line bg-surface text-ink-muted hover:border-input",
                  )}
                >
                  <input type="radio" name="con-kind" value={option.value} checked={on} onChange={() => setKind(option.value)} className="sr-only" />
                  {option.icon}
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className={cn("text-small", on ? (option.value === "DEPOSIT" ? "font-bold text-brand-ink" : "font-bold text-ink") : "font-semibold text-ink")}>{t(option.title)}</span>
                    <span className={cn("text-caption font-normal", on ? "text-current" : "text-ink-muted")}>{t(option.sub)}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-3">
        <Field htmlFor="con-date" label={label(t("Date"))} hint={t("Counts in {month}", { month: countsIn })}>
          <DayInput id="con-date" size="lg" value={date} onChange={setDate} max={today} aria-describedby="con-date-hint" />
        </Field>
        <Field htmlFor="con-amount" label={label(t("Amount"))}>
          <Input
            id="con-amount"
            size="lg"
            inputMode="decimal"
            {...amountField}
            autoFocus
            placeholder="0"
            invalid={tried && !(value > 0)}
            className="text-h3 font-bold tabular-nums"
            leading={<span className="flex h-12 w-10 items-center justify-center border-r border-line bg-strip text-title font-semibold text-ink-2">{currencySymbol(currency)}</span>}
            frameClassName="overflow-hidden pl-0"
          />
          {kind === "DEPOSIT" && !special && dues > 0 && member && (
            <button type="button" onClick={() => setAmount(String(dues))} className="mt-2 inline-flex h-6.5 items-center self-start rounded-full border border-mint-200 bg-mint-50 px-3 text-caption font-semibold text-brand-ink hover:bg-mint-200">
              {t("Fill {month} dues · {amount}", { month: monthLabel, amount: formatCurrency(dues, currency, fmt) })}
            </button>
          )}
        </Field>
      </div>

      <Field htmlFor="con-member" label={label(t("Member"))}>
        <MemberPicker id="con-member" label={t("Member")} members={active} value={memberId} onChange={setMemberId} currency={currency} balances={balances} size="md" disabled={special} />
      </Field>

      {!special && accountants.length > 0 && (
        <Field htmlFor="con-given" label={label(kind === "RETURN" ? t("Paid back by") : t("Given to"))}>
          <NativeSelect id="con-given" size="md" value={givenTo} onChange={(event) => setGivenTo(event.target.value)} frameClassName="w-full">
            {accountants.map((accountant) => (
              <option key={accountant.id} value={accountant.id}>
                {t("{name} (accountant)", { name: accountant.name })}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}

      <Field htmlFor="con-note" label={label(t("Note"), true)}>
        <Input id="con-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={140} placeholder={t("e.g. {month} share", { month: monthLabel })} />
      </Field>

      {member && value > 0 && (
        <div className="flex flex-col gap-2 rounded-md border border-line bg-strip px-4 py-3 text-small tabular-nums">
          <span className="text-caption font-semibold text-ink-muted">{t("After saving")}</span>
          <div className="flex flex-wrap justify-between gap-x-3">
            <span className="text-ink-2">{t("{name}'s {month} balance", { name: shortName(member.name), month: monthLabel })}</span>
            <span>
              <span className={balance < 0 ? "text-expense" : balance > 0 ? "text-income" : "text-ink-muted"}>{formatSignedCurrency(balance, currency, fmt)}</span>
              <span className="text-ink-muted"> → </span>
              <b className={cn("font-bold", balance + delta < -0.004 ? "text-expense" : balance + delta > 0.004 ? "text-income" : "text-ink")}>{Math.abs(balance + delta) < 0.005 ? `${formatCurrency(0, currency, fmt)} · ${t("settled")}` : formatSignedCurrency(balance + delta, currency, fmt)}</b>
            </span>
          </div>
          {!special && (
            <div className="flex flex-wrap justify-between gap-x-3">
              <span className="text-ink-2">{t("Cash in hand")}</span>
              <span>
                <span className="text-ink-muted">{formatCurrency(cashInHand, currency, fmt)} → </span>
                <b className="font-bold text-ink">{formatCurrency(cashInHand + delta, currency, fmt)}</b>
              </span>
            </div>
          )}
        </div>
      )}

      {tried && !valid && <p className="text-small font-semibold text-expense">{t("Enter an amount and pick the member.")}</p>}
    </GroupDialog>
  );
}
