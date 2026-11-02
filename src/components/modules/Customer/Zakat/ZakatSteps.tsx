"use client";

import { ArrowDown, ArrowUp, Banknote, Check, ChevronDown, ChevronUp, Gem, PiggyBank, Plus, Scale, Trash2, TrendingUp, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import Card from "@/components/smartly/Card";
import IconTile from "@/components/smartly/IconTile";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { Tone } from "@/components/smartly/tones";
import { Switch } from "@/components/ui/switch";
import { checkedCount, lineNote, STEP_META } from "@/lib/customer/zakatDisplay";
import type { ZakatCheckStep, ZakatDebtMode, ZakatLine, ZakatStep, ZakatStepId, ZakatSummary } from "@/lib/customer/zakatTypes";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const STEP_LOOK: Record<ZakatStepId, { icon: LucideIcon; tone: Tone }> = {
  CASH: { icon: Banknote, tone: "money" },
  SAVINGS: { icon: PiggyBank, tone: "habits" },
  GOLD: { icon: Gem, tone: "warning" },
  INVESTMENTS: { icon: TrendingUp, tone: "info" },
  OWED_TO_YOU: { icon: ArrowUp, tone: "income" },
  YOU_OWE: { icon: ArrowDown, tone: "expense" },
  NOT_COUNTED: { icon: X, tone: "neutral" },
};

export interface StepHandlers {
  onToggleLine: (line: ZakatLine) => void;
  onDebtMode: (line: ZakatLine, mode: ZakatDebtMode) => void;
  onForSale: (line: ZakatLine, forSale: boolean) => void;
  onWeigh: (line: ZakatLine) => void;
  onRemoveExtra: (line: ZakatLine, step: ZakatStepId) => void;
  onAdd: (step: ZakatCheckStep) => void;
  onCheck: (step: ZakatCheckStep, checked: boolean) => void;
}

interface ZakatStepsProps extends StepHandlers {
  summary: ZakatSummary;
  money: (value: number | string) => string;
  openStep: ZakatStepId | null;
  onOpen: (step: ZakatStepId | null) => void;
  // The line or step a change is on its way for: its controls wait.
  pending: string | null;
  readOnly: boolean;
}

// "Check your numbers" (board: Zakat's steps): seven steps, six to check,
// each opening to its lines from the member's own pages; a line can be
// left out, a debt taken off whole or for a year, an asset bought to sell
// counted, gold weighed, and something not in the app added.
export function ZakatSteps({ summary, money, openStep, onOpen, pending, readOnly, ...handlers }: ZakatStepsProps) {
  const { t, fmt } = useLocale();
  const done = checkedCount(summary);
  const all = done === 6;

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-col gap-3 px-5 pt-4.5 pb-4 sm:flex-row sm:items-center sm:gap-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.75">
          <h2 className="text-[16.5px] font-semibold text-ink">{t("Check your numbers")}</h2>
          <p className="text-small leading-[1.45] text-ink-muted">{t('Most numbers come from your pages. Open each step, fix anything wrong, then tap "Yes, this is right".')}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
          <span className={cn("text-[12.5px] font-semibold", all ? "text-income" : "text-ink-muted")}>
            {all ? t("All 6 checked") : t("{count} of 6 checked", { count: formatCount(done, fmt) })}
          </span>
          <span role="progressbar" aria-label={t("Steps checked")} aria-valuemin={0} aria-valuemax={6} aria-valuenow={done} className="block h-1.5 w-35 overflow-hidden rounded-full bg-surface-sunken">
            <span className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.round((done / 6) * 100)}%` }} />
          </span>
        </div>
      </div>
      {summary.steps.map((step, index) => (
        <StepBlock key={step.step} step={step} index={index} summary={summary} money={money} open={openStep === step.step} onOpen={onOpen} pending={pending} readOnly={readOnly} {...handlers} />
      ))}
    </Card>
  );
}

interface StepBlockProps extends StepHandlers {
  step: ZakatStep;
  index: number;
  summary: ZakatSummary;
  money: (value: number | string) => string;
  open: boolean;
  onOpen: (step: ZakatStepId | null) => void;
  pending: string | null;
  readOnly: boolean;
}

function StepBlock({ step, index, summary, money, open, onOpen, pending, readOnly, onAdd, onCheck, ...lineHandlers }: StepBlockProps) {
  const { t, fmt } = useLocale();
  const meta = STEP_META[step.step];
  const look = STEP_LOOK[step.step];
  const checkable = step.step !== "NOT_COUNTED";
  const ok = checkable && step.checked;
  const bodyId = `zk-step-${step.step}`;
  const total = meta.kind === "skip" ? t("No zakat") : meta.kind === "minus" ? `− ${money(step.total)}` : money(step.total);

  return (
    <div className="border-t border-divider">
      <button
        type="button"
        onClick={() => onOpen(open ? null : step.step)}
        aria-expanded={open}
        aria-controls={bodyId}
        className={cn("flex w-full items-center gap-3 px-4 py-3.5 text-left text-ink hover:bg-hover sm:gap-3.5 sm:px-5", open && "bg-strip")}
      >
        <span
          className={cn(
            "flex size-7.5 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
            ok ? "bg-income text-white" : open ? "border-[1.5px] border-primary text-emerald" : "border-[1.5px] border-line-strong text-ink-muted",
          )}
        >
          {ok ? <Check className="size-3.75" strokeWidth={3} aria-label={t("Checked")} /> : formatCount(index + 1, fmt)}
        </span>
        <IconTile tone={look.tone} size={36} className="max-sm:hidden">
          <look.icon />
        </IconTile>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{t(meta.title)}</span>
          <span className="text-[12.5px] text-ink-muted">{t(meta.question)}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className={cn("text-[15px] font-bold whitespace-nowrap tabular-nums", meta.kind === "minus" ? "text-expense" : meta.kind === "skip" ? "text-ink-faint" : "text-ink")}>{total}</span>
          {checkable && <span className={cn("text-[11.5px] font-semibold", ok ? "text-income" : "text-warning")}>{t(ok ? "Checked" : "To check")}</span>}
        </span>
        {open ? <ChevronUp className="size-4.5 shrink-0 text-ink-faint" aria-hidden="true" /> : <ChevronDown className="size-4.5 shrink-0 text-ink-faint" aria-hidden="true" />}
      </button>
      {open && (
        <div id={bodyId} className="flex flex-col gap-2.5 px-4 pb-4 sm:pr-5 sm:pl-16">
          {meta.tip && <p className={cn("rounded-xl px-3 py-2.5 text-[12.5px] leading-normal", meta.kind === "minus" ? "bg-expense-soft text-expense" : "bg-mint-50 text-brand-ink")}>{t(meta.tip)}</p>}
          {step.lines.length > 0 ? (
            <ul className="overflow-hidden rounded-[14px] border border-divider">
              {step.lines.map((line) => (
                <LineRow key={line.key} line={line} step={step.step} summary={summary} money={money} busy={pending === line.key} readOnly={readOnly} {...lineHandlers} />
              ))}
            </ul>
          ) : (
            <p className="rounded-xl bg-strip px-3.5 py-3 text-small text-ink-muted">{t(checkable ? "Nothing in the app for this step." : "Nothing here.")}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
            {checkable && !readOnly && (
              <button type="button" onClick={() => onAdd(step.step as ZakatCheckStep)} className="flex items-center gap-1.5 rounded-sm text-[13px] font-semibold text-emerald hover:underline pointer-coarse:min-h-11">
                <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                {t(meta.addLabel)}
              </button>
            )}
            <Link href={meta.href} className="rounded-sm text-[12.5px] text-ink-muted hover:text-ink hover:underline pointer-coarse:min-h-11 pointer-coarse:content-center">
              {t(meta.from)} ›
            </Link>
            <span className="flex-1" />
            {checkable && !readOnly && (
              <button
                type="button"
                onClick={() => onCheck(step.step as ZakatCheckStep, !ok)}
                disabled={pending === `step:${step.step}`}
                aria-pressed={ok}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-semibold whitespace-nowrap disabled:opacity-60 pointer-coarse:h-11",
                  ok ? "bg-income-soft text-income hover:bg-income-soft/80" : "bg-primary text-primary-foreground shadow-button hover:bg-emerald-hover",
                )}
              >
                <Check className="size-3.5" strokeWidth={2.75} aria-hidden="true" />
                {t(ok ? "Checked" : "Yes, this is right")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface LineRowProps extends Omit<StepHandlers, "onAdd" | "onCheck"> {
  line: ZakatLine;
  step: ZakatStepId;
  summary: ZakatSummary;
  money: (value: number | string) => string;
  busy: boolean;
  readOnly: boolean;
}

function LineRow({ line, step, summary, money, busy, readOnly, onToggleLine, onDebtMode, onForSale, onWeigh, onRemoveExtra }: LineRowProps) {
  const { t, fmt } = useLocale();
  const extra = line.source === "EXTRA";
  const minus = step === "YOU_OWE";
  const skip = step === "NOT_COUNTED";
  const muted = skip || !line.counted;
  const debtChoice = minus && !extra && line.fullAmount !== undefined && line.fullAmount !== line.yearAmount;
  const weighable = step === "GOLD" && line.source === "ASSET";
  const off = readOnly || busy;
  const name = line.source === "ACCOUNT" && line.detail === "cash" && line.name === "Cash" ? t("Cash") : line.name;

  return (
    <li className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-divider px-3.5 py-2 last:border-b-0 sm:min-h-13 sm:flex-nowrap", busy && "opacity-70")}>
      {!extra && !skip && (
        <Switch checked={line.counted} disabled={off} onCheckedChange={() => onToggleLine(line)} aria-label={t("Count {name}", { name })} className="shrink-0" />
      )}
      <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5", !line.counted && !extra && "opacity-60")}>
        <span className="flex min-w-0 items-center gap-1.5 text-body font-medium text-ink">
          <span className="truncate">{name}</span>
          {extra && <span className="shrink-0 rounded-full bg-mint-50 px-1.75 text-[10.5px] font-semibold text-brand-ink">{t("Added by you")}</span>}
        </span>
        <span className="text-[12.5px] text-ink-muted">{lineNote(line, step, summary.prices.perVori, money, t, fmt)}</span>
      </div>
      {debtChoice && (
        <SegmentedControl<ZakatDebtMode>
          label={t("How much of {name} to take off", { name })}
          variant="pill"
          disabled={off}
          value={line.debtMode ?? "YEAR"}
          onChange={(mode) => mode !== line.debtMode && onDebtMode(line, mode)}
          options={[
            { value: "YEAR", label: "Next 12 months" },
            { value: "FULL", label: "Full amount" },
          ]}
          className="shrink-0"
        />
      )}
      {(skip || line.forSale) && !readOnly && (
        <button type="button" disabled={busy} onClick={() => onForSale(line, !line.forSale)} className="h-7.5 shrink-0 rounded-full border border-line-strong bg-surface px-3 text-[12.5px] font-semibold whitespace-nowrap text-ink hover:bg-surface-sunken disabled:opacity-60 pointer-coarse:h-11">
          {t(line.forSale ? "I use it" : "I bought it to sell")}
        </button>
      )}
      {weighable && !readOnly && (
        <button type="button" disabled={busy} onClick={() => onWeigh(line)} className="flex h-7.5 shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[12.5px] font-semibold whitespace-nowrap text-ink hover:bg-surface-sunken disabled:opacity-60 pointer-coarse:h-11">
          <Scale className="size-3.5" aria-hidden="true" />
          {t(line.byWeight ? "Change weight" : "Add weight")}
        </button>
      )}
      <span className={cn("min-w-25 text-right text-[14.5px] font-semibold whitespace-nowrap tabular-nums max-sm:ml-auto", muted ? "text-ink-faint line-through" : minus ? "text-expense" : "text-ink")}>
        {minus ? `− ${money(line.amount)}` : money(line.amount)}
      </span>
      {extra && !readOnly && (
        <button type="button" disabled={busy} onClick={() => onRemoveExtra(line, step)} aria-label={t("Remove {name}", { name })} title={t("Remove {name}", { name })} className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-surface-sunken hover:text-expense disabled:opacity-60 pointer-coarse:size-11">
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </li>
  );
}
