"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import type { GroupCostSplit, GroupMember } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { formatCurrency } from "@/lib/customer/currency";
import { setGroupCostSplitAction } from "@/lib/customer/groupExpensesActions";
import { addsUpToHundred } from "@/lib/customer/groupFamily";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { FOCUS_WITHIN, MemberAvatar } from "./GroupBits";
import { GroupDialog } from "./GroupDialog";

interface CostSplitDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  members: GroupMember[];
  mode: GroupCostSplit;
  // This month, and what it has spent so far.
  monthKey: string;
  spent: number;
}

const MODES: { value: GroupCostSplit; label: string; sub: string }[] = [
  { value: "EQUAL", label: "Equal", sub: "Everyone pays the same" },
  { value: "CUSTOM", label: "Custom %", sub: "Set a percent for each" },
];

const round1 = (value: number) => Math.round(value * 10) / 10;

// How a family's costs are split (the v7 Members board's dialog): the same
// for everyone, or a percent for each active member adding up to 100.
// Costs shared "by cost split" follow it; closed months keep theirs.
export function CostSplitDialog({ open, onClose, businessId, currency, members, mode, monthKey, spent }: CostSplitDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const active = members.filter((member) => member.status === "ACTIVE");
  const [choice, setChoice] = useState<GroupCostSplit>(mode);
  const [percents, setPercents] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setChoice(mode);
      const even = active.length > 0 ? round1(100 / active.length) : 0;
      setPercents(Object.fromEntries(active.map((member) => [member.id, mode === "CUSTOM" && member.costPercent !== null && member.costPercent !== undefined ? String(Number(member.costPercent)) : String(even)])));
    }
  }

  const values = active.map((member) => (choice === "EQUAL" ? 100 / Math.max(active.length, 1) : Number(percents[member.id] || 0)));
  const total = values.reduce((sum, value) => sum + value, 0);
  const ok = choice === "EQUAL" || addsUpToHundred(values);
  const changed = choice !== mode || (choice === "CUSTOM" && active.some((member) => Number(member.costPercent ?? -1) !== Number(percents[member.id] || 0)));

  function save() {
    if (!ok || isPending) return;
    startTransition(async () => {
      const result = await attempt(
        () => setGroupCostSplitAction(businessId, choice === "EQUAL" ? { mode: "EQUAL" } : { mode: "CUSTOM", members: active.map((member) => ({ groupMemberId: member.id, percent: Number(percents[member.id] || 0) })) }),
        t(OFFLINE_MESSAGE),
        t(STALE_MESSAGE),
      );
      if (!result.success) {
        toast.error(result.message ?? t("Failed to save the cost split"));
        return;
      }
      toast.success(t("Cost split saved"));
      onClose();
      router.refresh();
    });
  }

  return (
    <GroupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={520}
      title={t("How costs are split")}
      sub={t("Each expense is shared by these percentages. Applies from {month}; closed months keep their old split.", { month: monthName(monthKey, fmt, "long", true) })}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="button" onClick={save} disabled={!ok || !changed || isPending}>
            {isPending && <Loader />}
            {t("Save split")}
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label={t("How costs are split")} className="grid grid-cols-2 gap-2">
        {MODES.map((option) => {
          const on = option.value === choice;
          return (
            <label key={option.value} className={cn("relative flex min-h-control-lg cursor-pointer flex-col justify-center gap-px rounded-md border px-3 py-2", FOCUS_WITHIN, on ? "border-[1.5px] border-emerald bg-mint-50/60" : "border-line bg-surface hover:border-input")}>
              <input type="radio" name="split-mode" checked={on} onChange={() => setChoice(option.value)} className="sr-only" />
              <span className={cn("text-small text-ink", on ? "font-bold" : "font-semibold")}>{t(option.label)}</span>
              <span className="text-caption text-ink-muted">{t(option.sub)}</span>
            </label>
          );
        })}
      </div>

      <div className="flex flex-col overflow-hidden rounded-field border border-line">
        {active.map((member, index) => {
          const value = values[index];
          return (
            <div key={member.id} className="flex items-center gap-3 border-b border-divider px-3.5 py-2.5 tabular-nums">
              <MemberAvatar member={member} members={members} size={32} />
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate font-semibold text-ink">{member.name}</span>
                <span className="text-caption text-ink-muted">{t("{amount} of {total} this month", { amount: formatCurrency((spent * value) / 100, currency, fmt), total: formatCurrency(spent, currency, fmt) })}</span>
              </span>
              {choice === "CUSTOM" ? (
                <Input
                  size="sm"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step={0.5}
                  value={percents[member.id] ?? ""}
                  onChange={(event) => setPercents({ ...percents, [member.id]: event.target.value })}
                  aria-label={t("{name} percent", { name: member.name })}
                  frameClassName="w-23"
                  className="text-right"
                  trailing={<span className="pr-2.5 text-ink-muted">%</span>}
                />
              ) : (
                <span className="font-semibold text-ink">{formatCount(round1(value), fmt)}%</span>
              )}
            </div>
          );
        })}
        <div className="-mt-px flex items-center justify-between border-t border-divider bg-strip px-3.5 py-2.5 text-small font-semibold">
          <span>{t("Total")}</span>
          <span className={ok ? "text-income" : "text-expense"}>{ok ? t("100% ✓") : t("{percent}% · must be 100%", { percent: formatCount(round1(total), fmt) })}</span>
        </div>
      </div>
      <p className="text-caption text-ink-muted">{t("Example: 2 members 50 / 50 · 3 members 50 / 25 / 25. Inactive members are left out.")}</p>
    </GroupDialog>
  );
}
