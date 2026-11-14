"use client";

import { Check, Plus, Scale, Trash2 } from "lucide-react";
import Link from "next/link";
import IconAction from "@/components/smartly/IconAction";
import { checkedCount, lineNote, STEP_META } from "@/lib/customer/zakatDisplay";
import type { ZakatCheckStep, ZakatDebtMode, ZakatLine, ZakatStep, ZakatStepId, ZakatSummary } from "@/lib/customer/zakatTypes";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// Each step's glyph (the board's own paths) and its tile's tint.
const STEP_LOOK: Record<ZakatStepId, { icon: string; tile: string }> = {
  CASH: { icon: "M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z M12 10a2 2 0 1 0 0 4 2 2 0 1 0 0-4z", tile: "bg-mint-50 text-emerald" },
  SAVINGS: {
    icon: "M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z",
    tile: "bg-tint-violet text-tint-violet-ink",
  },
  GOLD: { icon: "M6 3h12l4 6-10 13L2 9z M11 3 8 9l4 13 4-13-3-6 M2 9h20", tile: "bg-warning-soft text-warning" },
  INVESTMENTS: { icon: "M3 3v16a2 2 0 0 0 2 2h16 M7 14l4-4 4 4 5-5", tile: "bg-tint-blue text-tint-blue-ink" },
  OWED_TO_YOU: { icon: "M12 19V5 M5 12l7-7 7 7", tile: "bg-tint-green text-tint-green-ink" },
  YOU_OWE: { icon: "M12 5v14 M19 12l-7 7-7-7", tile: "bg-expense-soft text-loss-ink" },
  NOT_COUNTED: { icon: "M18 6 6 18 M6 6l12 12", tile: "bg-page text-ink-muted" },
};

const Glyph = ({ d, size, stroke = 2, className }: { d: string; size: number; stroke?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d={d} />
  </svg>
);

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
    <section aria-labelledby="zk-check" className="overflow-hidden rounded-[18px] border border-line-card bg-surface text-ink shadow-card">
      <div className="flex flex-col gap-3 px-4 pt-4.5 pb-4 sm:flex-row sm:items-center sm:gap-3.5 sm:px-5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.75">
          <h2 id="zk-check" className="text-[16.5px] font-semibold">
            {t("Check your numbers")}
          </h2>
          <p className="text-[13px] leading-[1.45] text-ink-muted">{t('Most numbers come from your pages. Open each step, fix anything wrong, then tap "Yes, this is right".')}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
          <span className={cn("text-[12.5px] font-semibold", all ? "text-tint-green-ink" : "text-ink-muted")}>
            {all ? t("All 6 checked") : t("{count} of 6 checked", { count: formatCount(done, fmt) })}
          </span>
          <span role="progressbar" aria-label={t("Steps checked")} aria-valuemin={0} aria-valuemax={6} aria-valuenow={done} className="block h-1.5 w-35 overflow-hidden rounded-full bg-sunken-rule">
            <span className="block h-full rounded-full bg-emerald transition-[width]" style={{ width: `${Math.round((done / 6) * 100)}%` }} />
          </span>
        </div>
      </div>
      {summary.steps.map((step, index) => (
        <StepBlock key={step.step} step={step} index={index} summary={summary} money={money} open={openStep === step.step} onOpen={onOpen} pending={pending} readOnly={readOnly} {...handlers} />
      ))}
    </section>
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
    <div className="border-t border-sunken-rule">
      <button
        type="button"
        onClick={() => onOpen(open ? null : step.step)}
        aria-expanded={open}
        aria-controls={bodyId}
        className={cn("flex w-full items-center gap-3 px-4 py-3.5 text-left text-ink hover:bg-strip sm:gap-3.5 sm:px-5", open ? "bg-strip" : "bg-surface")}
      >
        <span
          className={cn(
            "flex size-7.5 shrink-0 items-center justify-center rounded-full bg-surface text-[13px] font-bold",
            ok ? "bg-success text-white" : open ? "border-[1.5px] border-emerald text-emerald" : "border-[1.5px] border-input text-ink-muted",
          )}
        >
          {ok ? <Check className="size-3.75" strokeWidth={3} aria-label={t("Checked")} /> : formatCount(index + 1, fmt)}
        </span>
        <span className={cn("flex size-8.5 shrink-0 items-center justify-center rounded-[10px] max-sm:hidden", look.tile)}>
          <Glyph d={look.icon} size={17} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{t(meta.title)}</span>
          <span className="text-[12.5px] text-ink-muted">{t(meta.question)}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className={cn("text-[15px] font-bold whitespace-nowrap tabular-nums", meta.kind === "minus" ? "text-loss-ink" : meta.kind === "skip" ? "text-ink-faint" : "text-ink")}>{total}</span>
          {checkable && <span className={cn("text-[11.5px] font-semibold", ok ? "text-tint-green-ink" : "text-warning")}>{t(ok ? "Checked" : "To check")}</span>}
        </span>
        <Glyph d={open ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} size={18} className="shrink-0 text-ink-faint" />
      </button>
      {open && (
        <div id={bodyId} className="flex flex-col gap-2.5 px-4 pb-4 sm:pr-5 sm:pl-16">
          {meta.tip && <p className={cn("rounded-[12px] px-3 py-2.5 text-[12.5px] leading-normal", meta.kind === "minus" ? "bg-loss-wash text-deny-ink" : "bg-pick-wash text-brand-ink")}>{t(meta.tip)}</p>}
          {step.lines.length > 0 ? (
            <ul className="overflow-hidden rounded-[14px] border border-sunken-rule">
              {step.lines.map((line) => (
                <LineRow key={line.key} line={line} step={step.step} summary={summary} money={money} busy={pending === line.key} readOnly={readOnly} {...lineHandlers} />
              ))}
            </ul>
          ) : (
            <p className="rounded-[12px] bg-strip px-3.5 py-3 text-[13px] text-ink-muted">{t(checkable ? "Nothing in the app for this step." : "Nothing here.")}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
            {checkable && !readOnly && (
              <button type="button" onClick={() => onAdd(step.step as ZakatCheckStep)} className="flex items-center gap-1.5 rounded-sm text-[13px] font-semibold text-emerald hover:underline pointer-coarse:min-h-11">
                <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                {t(meta.addLabel)}
              </button>
            )}
            <Link href={meta.href} className="rounded-sm text-[12.5px] text-ink-muted hover:underline pointer-coarse:min-h-11 pointer-coarse:content-center">
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
                  ok ? "bg-tint-green text-tint-green-ink" : "bg-emerald text-white hover:bg-emerald-hover",
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

const DEBT_MODES: { value: ZakatDebtMode; label: string }[] = [
  { value: "YEAR", label: "Next 12 months" },
  { value: "FULL", label: "Full amount" },
];

// One line (board: a step's row): a switch to count it, its name and where
// it comes from, a debt's 12 months or whole, an asset bought to sell, the
// amount, and Remove for a line added by hand.
function LineRow({ line, step, summary, money, busy, readOnly, onToggleLine, onDebtMode, onForSale, onWeigh, onRemoveExtra }: LineRowProps) {
  const { t, fmt } = useLocale();
  const extra = line.source === "EXTRA";
  const minus = step === "YOU_OWE";
  const skip = step === "NOT_COUNTED";
  const off = !skip && !extra && !line.counted;
  const struck = skip || off;
  const debtChoice = minus && !extra && line.fullAmount !== undefined && line.fullAmount !== line.yearAmount;
  const weighable = step === "GOLD" && line.source === "ASSET";
  const locked = readOnly || busy;
  const name = line.source === "ACCOUNT" && line.detail === "cash" && line.name === "Cash" ? t("Cash") : line.name;

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-page px-3.5 py-2 hover:bg-hover sm:min-h-[69px] sm:flex-nowrap",
        off ? "opacity-60" : line.forSale ? "opacity-55" : busy && "opacity-70",
      )}
    >
      {!extra && !skip && (
        <button
          type="button"
          role="switch"
          aria-checked={line.counted}
          aria-label={t("Count {name}", { name })}
          disabled={locked}
          onClick={() => onToggleLine(line)}
          className={cn("relative h-5 w-9 shrink-0 rounded-full p-0 disabled:cursor-not-allowed", line.counted ? "bg-emerald" : "bg-input")}
        >
          <span className={cn("absolute top-0.5 size-4 rounded-full bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-[left]", line.counted ? "left-4.5" : "left-0.5")} />
        </button>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5 text-[14px] font-medium text-ink">
          <span className="truncate">{name}</span>
          {extra && <span className="shrink-0 rounded-full bg-primary-soft px-1.75 text-[10.5px] font-semibold text-brand-ink">{t("Added by you")}</span>}
        </span>
        <span className="text-[12.5px] text-ink-muted">{lineNote(line, step, summary.prices.perVori, money, t, fmt)}</span>
      </div>
      {debtChoice && (
        <div role="group" aria-label={t("How much of {name} to take off", { name })} className="flex shrink-0 gap-0.5 rounded-full bg-page p-0.75">
          {DEBT_MODES.map((mode) => {
            const on = (line.debtMode ?? "YEAR") === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                aria-pressed={on}
                disabled={locked}
                onClick={() => !on && onDebtMode(line, mode.value)}
                className={cn(
                  "h-7 rounded-full px-2.75 text-[12.5px] font-semibold whitespace-nowrap disabled:cursor-not-allowed pointer-coarse:h-10",
                  on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(18,32,29,0.12)]" : "text-ink-muted",
                )}
              >
                {t(mode.label)}
              </button>
            );
          })}
        </div>
      )}
      {(skip || line.forSale) && !readOnly && (
        <button type="button" disabled={busy} onClick={() => onForSale(line, !line.forSale)} className="h-7.5 shrink-0 rounded-full border border-input bg-surface px-3 text-[12.5px] font-semibold whitespace-nowrap text-ink hover:bg-pick-wash disabled:opacity-60 pointer-coarse:h-11">
          {t(line.forSale ? "I use it" : "I bought it to sell")}
        </button>
      )}
      {/* Not on the board: an asset's weight is kept only here, and it is what values it at today's price. */}
      {weighable && !readOnly && (
        <button type="button" disabled={busy} onClick={() => onWeigh(line)} className="flex h-7.5 shrink-0 items-center gap-1.5 rounded-full border border-input bg-surface px-3 text-[12.5px] font-semibold whitespace-nowrap text-ink hover:bg-pick-wash disabled:opacity-60 pointer-coarse:h-11">
          <Scale className="size-3.5" aria-hidden="true" />
          {t(line.byWeight ? "Change weight" : "Add weight")}
        </button>
      )}
      <span className={cn("min-w-25 text-right text-[14.5px] font-semibold whitespace-nowrap tabular-nums max-sm:ml-auto", struck ? "text-ink-faint line-through" : minus ? "text-loss-ink" : "text-ink")}>
        {minus ? `− ${money(line.amount)}` : money(line.amount)}
      </span>
      {extra && !readOnly && (
        <IconAction tone="danger" disabled={busy} onClick={() => onRemoveExtra(line, step)} aria-label={t("Remove {name}", { name })} title={t("Remove {name}", { name })}>
          <Trash2 aria-hidden="true" />
        </IconAction>
      )}
    </li>
  );
}
