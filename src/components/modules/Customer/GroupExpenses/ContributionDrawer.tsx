"use client";

import { ArrowDownToLine, ArrowUpFromLine, CalendarDays, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { GroupContribution, GroupMember } from "@/lib/customer/api";
import { currencySymbol, formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import type { MonthRange } from "@/lib/customer/groupDisplay";
import { createGroupContributionAction, updateGroupContributionAction } from "@/lib/customer/groupExpensesActions";
import { monthName } from "@/lib/customer/insights";
import { normalizeMoneyInput } from "@/lib/customer/money";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
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
export function ContributionDrawer({ open, onClose, businessId, currency, members, balances, cashInHand, range, today, editing, presetMemberId = null }: ContributionDrawerProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const active = members.filter((member) => member.status === "ACTIVE" || member.id === editing?.groupMemberId);
  const [memberId, setMemberId] = useState("");
  const [kind, setKind] = useState<Kind>("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
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
  const inMonth = date >= range.from && date <= range.to;
  const valid = memberId.length > 0 && value > 0 && date.length > 0;

  function save(addAnother: boolean) {
    if (!valid || isPending) return;
    startTransition(async () => {
      const input = { groupMemberId: memberId, amount: String(signed), date, note: note.trim() || undefined };
      const result = editing ? await updateGroupContributionAction(businessId, editing.id, { ...input, note: note.trim() }) : await createGroupContributionAction(businessId, input);
      if (!result.success) {
        toast.error(result.message ?? t("Failed to save the contribution"));
        return;
      }
      toast.success(editing ? t("Contribution updated") : kind === "RETURN" ? t("Return recorded") : t("Contribution recorded"));
      router.refresh();
      if (addAnother) {
        setAmount("");
        setNote("");
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

  const monthLabel = monthName(range.key, locale);
  const kinds: { value: Kind; icon: React.ReactNode; title: string; sub: string }[] = [
    { value: "DEPOSIT", icon: <ArrowDownToLine />, title: "Deposit", sub: "Member gives money" },
    { value: "RETURN", icon: <ArrowUpFromLine />, title: "Return money", sub: "Fund pays back" },
  ];

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-115 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-115" : "h-[92vh] rounded-t-xl")}>
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="text-h3 text-ink">{editing ? t("Edit contribution") : t("Add contribution")}</SheetTitle>
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
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <Field htmlFor="con-member" label={label(t("Member"))}>
              <MemberPicker id="con-member" members={active} value={memberId} onChange={setMemberId} currency={currency} balances={balances} />
            </Field>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body font-medium text-ink">{t("Type")}</legend>
              <div role="radiogroup" className="grid grid-cols-2 gap-2">
                {kinds.map((option) => {
                  const on = kind === option.value;
                  return (
                    <button key={option.value} type="button" role="radio" aria-checked={on} onClick={() => setKind(option.value)} className={cn("flex h-13.5 items-center gap-3 rounded-md border px-3 text-left transition-colors [&_svg]:size-5 [&_svg]:shrink-0", on ? (option.value === "DEPOSIT" ? "border-[1.5px] border-emerald bg-mint-50 text-emerald" : "border-[1.5px] border-expense bg-expense-soft text-expense") : "border-line bg-surface text-ink-muted hover:border-line-strong")}>
                      {option.icon}
                      <span className="flex flex-col gap-px">
                        <span className={cn("text-small", on ? "font-bold text-ink" : "font-semibold text-ink")}>{t(option.title)}</span>
                        <span className={cn("text-caption font-normal", on ? "text-current" : "text-ink-muted")}>{t(option.sub)}</span>
                      </span>
                    </button>
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
                  value={amount}
                  onChange={(event) => setAmount(normalizeMoneyInput(event.target.value))}
                  placeholder="0"
                  className="text-h3 font-bold tabular-nums"
                  leading={<span className="flex h-12 w-10 items-center justify-center border-r border-line bg-cream text-title font-semibold text-ink-2">{currencySymbol(currency)}</span>}
                  frameClassName="overflow-hidden pl-0"
                />
                {kind === "DEPOSIT" && dues > 0 && member && (
                  <button type="button" onClick={() => setAmount(String(dues))} className="mt-2 inline-flex h-6.5 items-center self-start rounded-full border border-mint-200 bg-mint-50 px-3 text-caption font-semibold text-emerald hover:bg-mint-200">
                    {t("Fill")} {monthLabel} {t("dues")} · {formatCurrency(dues, currency)}
                  </button>
                )}
              </Field>
              <Field htmlFor="con-date" label={label(t("Date"))} hint={inMonth ? `${t("Counts in")} ${monthLabel}` : `${t("Counts in")} ${monthName(date.slice(0, 7) || range.key, locale)}`}>
                <Input id="con-date" type="date" size="lg" value={date} onChange={(event) => setDate(event.target.value)} max={today} leading={<CalendarDays />} className="px-0" frameClassName="px-3" />
              </Field>
            </div>

            <Field htmlFor="con-note" label={label(t("Note"), true)}>
              <Input id="con-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={140} placeholder={`${monthLabel} ${t("dues, paid in cash")}`} />
            </Field>

            {member && value > 0 && (
              <div className="flex flex-col gap-2 rounded-md border border-line bg-cream px-4 py-3 text-small tabular-nums">
                <span className="text-caption font-semibold text-ink-muted">{t("After saving")}</span>
                <div className="flex justify-between gap-3">
                  <span className="text-ink-2">
                    {member.name}
                    {t("'s")} {monthLabel} {t("balance")}
                  </span>
                  <span>
                    <span className={balance < 0 ? "text-expense" : balance > 0 ? "text-income" : "text-ink-muted"}>{formatSignedCurrency(balance, currency)}</span>
                    <span className="text-ink-muted"> → </span>
                    <b className={cn("font-bold", balance + delta < -0.004 ? "text-expense" : balance + delta > 0.004 ? "text-income" : "text-ink")}>{Math.abs(balance + delta) < 0.005 ? `${formatCurrency(0, currency)} · ${t("settled")}` : formatSignedCurrency(balance + delta, currency)}</b>
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-ink-2">{t("Cash in hand")}</span>
                  <span>
                    <span className="text-ink-muted">{formatCurrency(cashInHand, currency)} → </span>
                    <b className="font-bold text-ink">{formatCurrency(cashInHand + delta, currency)}</b>
                  </span>
                </div>
              </div>
            )}
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
              {editing ? t("Save changes") : t("Save")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
