"use client";

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
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { groupMonthOf, type MonthRange, shortName, startDayOf } from "@/lib/customer/groupDisplay";
import { createGroupContributionAction, updateGroupContributionAction } from "@/lib/customer/groupExpensesActions";
import { accountantsOf } from "@/lib/customer/groupFamily";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { GroupDialog } from "./GroupDialog";
import type { ClosedGuard } from "./groupTypes";
import { MemberPicker } from "./MemberPicker";

interface ContributionDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  members: GroupMember[];
  // The month's balance per member, for the member picker.
  balances: Record<string, number>;
  // The accountant money goes to when nobody is picked.
  holderId: string | null;
  // What each member has given in the month so far, for the preview.
  given: Record<string, number>;
  range: MonthRange;
  today: string;
  editing: GroupContribution | null;
  // Open with a member already chosen (from their row or statement).
  presetMemberId?: string | null;
  closedGuard: ClosedGuard;
  // An Editor works only in their own name: this member, fixed.
  selfOnly?: string | null;
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
export function ContributionDrawer({ open, onClose, businessId, currency, members, balances, holderId, given, range, today, editing, presetMemberId = null, closedGuard, selfOnly = null }: ContributionDrawerProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const active = members.filter((member) => (member.status === "ACTIVE" || member.id === editing?.groupMemberId) && (!selfOnly || member.id === selfOnly));
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
      setMemberId(editing?.groupMemberId ?? selfOnly ?? presetMemberId ?? "");
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

  const holder = givenTo ? members.find((m) => m.id === givenTo) : undefined;
  const givenNow = (given[memberId] ?? 0) + (kind === "DEPOSIT" ? delta : 0);
  const field = "h-11.5 rounded-[12px]";

  return (
    <GroupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={520}
      title={editing ? t("Edit contribution") : t("Add contribution")}
      sub={kind === "RETURN" ? t("Money an accountant paid back") : t("Money a member gave to the group")}
      bodyClassName="gap-3.5"
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
            {editing ? t("Save changes") : t("Save contribution")}
          </Button>
        </>
      }
    >
      <Field htmlFor="con-member" label={label(t("Member"))}>
        <MemberPicker id="con-member" label={t("Member")} members={active} value={memberId} onChange={setMemberId} currency={currency} balances={balances} size="md" disabled={special} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field htmlFor="con-amount" label={label(t("Amount"))}>
          <Input
            id="con-amount"
            size="md"
            inputMode="decimal"
            {...amountField}
            autoFocus
            placeholder="0"
            invalid={tried && !(value > 0)}
            className="font-semibold tabular-nums"
            leading={<span className="text-[15px] font-semibold text-ink-faint">{currencySymbol(currency, fmt)}</span>}
            frameClassName={field}
          />
        </Field>
        <Field htmlFor="con-date" label={label(t("Date"))} hint={t("Counts in {month}", { month: countsIn })}>
          <DayInput id="con-date" size="md" value={date} onChange={setDate} max={today} aria-describedby="con-date-hint" />
        </Field>
      </div>
      {kind === "DEPOSIT" && !special && dues > 0 && member && (
        <button type="button" onClick={() => setAmount(String(dues))} className="-mt-1.5 inline-flex h-6.5 items-center self-start rounded-full border border-mint-200 bg-mint-50 px-3 text-caption font-semibold text-brand-ink hover:bg-mint-200">
          {t("Fill {month} dues · {amount}", { month: monthLabel, amount: formatCurrency(dues, currency, fmt) })}
        </button>
      )}

      {!special && accountants.length > 0 && (
        <Field htmlFor="con-given" label={label(kind === "RETURN" ? t("Paid back by") : t("Given to"))} hint={t("The Admin or an Editor who now keeps this cash.")}>
          <NativeSelect id="con-given" size="md" value={givenTo} onChange={(event) => setGivenTo(event.target.value)} frameClassName="w-full" className={field}>
            {accountants.map((accountant) => (
              <option key={accountant.id} value={accountant.id}>
                {accountant.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}

      <Field htmlFor="con-note" label={label(t("Note"), true)}>
        <Input id="con-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={140} placeholder={t("e.g. {month} share", { month: monthLabel })} frameClassName={field} />
      </Field>

      {member && value > 0 && kind === "DEPOSIT" && !special && (
        <p aria-live="polite" className="rounded-[12px] border border-emerald-line bg-emerald-wash px-3.5 py-2.5 text-[13px] leading-normal text-brand-ink">
          {holder
            ? t("{name} will have given {amount} in {month}, and {holder} keeps the cash.", { name: shortName(member.name), amount: formatCurrency(givenNow, currency, fmt), month: monthName(range.key, fmt, "long", true), holder: shortName(holder.name) })
            : t("{name} will have given {amount} in {month}.", { name: shortName(member.name), amount: formatCurrency(givenNow, currency, fmt), month: monthName(range.key, fmt, "long", true) })}
        </p>
      )}

      {tried && !valid && <p className="text-small font-semibold text-expense">{t("Enter an amount and pick the member.")}</p>}
    </GroupDialog>
  );
}
