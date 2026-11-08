"use client";

import { Check, Lock, Sparkles, TrendingUp, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { AiSection } from "@/lib/customer/aiInsightsTypes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export const READ_OPTIONS: { value: AiSection; label: string }[] = [
  { value: "TRANSACTIONS", label: "Transactions and budgets" },
  { value: "SAVINGS", label: "Savings goals" },
  { value: "LOANS", label: "Loans and contacts" },
  { value: "GROUPS", label: "Group expenses" },
];

const PERKS = [
  { Icon: TrendingUp, title: "A short summary every morning", text: "What changed, in two or three plain lines." },
  { Icon: TriangleAlert, title: "Warnings before it is too late", text: "Budgets running out, unusual bills, goals falling behind." },
  { Icon: Sparkles, title: "Ask in Bangla or English", text: "How much on groceries? Who owes me? Can I afford this?" },
];

// The AIInsightsOff board: what AI Insights does, what it may read (the
// person picks), and Turn on.
export function AiTurnOn({ reads: initial, busy, readOnly, onTurnOn }: { reads: AiSection[]; busy: boolean; readOnly: boolean; onTurnOn: (reads: AiSection[]) => void }) {
  const { t } = useLocale();
  const [reads, setReads] = useState<AiSection[]>(initial);
  const toggle = (value: AiSection) => setReads((now) => (now.includes(value) ? now.filter((row) => row !== value) : [...now, value]));
  return (
    <div className="flex justify-center pt-2">
      <section aria-labelledby="ai-on-title" className="flex w-full max-w-135 flex-col gap-4.5 rounded-[22px] border border-line-card bg-surface px-8 pt-7.5 pb-6.5 shadow-[0_1px_2px_rgba(18,32,29,0.04),0_10px_30px_rgba(18,32,29,0.06)] max-sm:px-5">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <span className="flex size-15 items-center justify-center rounded-full bg-emerald-soft text-emerald">
            <Sparkles className="size-6.5" aria-hidden="true" />
          </span>
          <h2 id="ai-on-title" className="text-[21px] font-semibold tracking-[-0.01em] text-ink">
            {t("Get advice from your own numbers")}
          </h2>
          <p className="text-body leading-normal text-ink-muted">{t("AI reads your Smartly records and tells you, in simple words, what changed and what to do next.")}</p>
        </div>
        <div className="flex flex-col gap-2.5">
          {PERKS.map(({ Icon, title, text }) => (
            <div key={title} className="flex items-start gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-emerald-soft text-emerald">
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-px">
                <span className="text-body font-semibold text-ink">{t(title)}</span>
                <span className="text-small text-ink-muted">{t(text)}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 rounded-[14px] border border-line-card bg-table-head p-3.5">
          <span className="text-small font-semibold text-ink-2">{t("What AI can read")}</span>
          {READ_OPTIONS.map((option) => {
            const on = reads.includes(option.value);
            return (
              <button key={option.value} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(option.value)} className="flex items-center gap-2.25 text-left text-[13.5px] text-ink">
                <span className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-[5px]", on ? "bg-primary text-primary-foreground" : "border-[1.5px] border-input bg-surface")}>
                  {on && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
                </span>
                {t(option.label)}
              </button>
            );
          })}
          <span className="flex items-center gap-2.25 text-[13.5px] text-ink-muted">
            <Lock className="size-4" aria-hidden="true" />
            {t("Password Manager is never read")}
          </span>
        </div>
        <p className="text-[12.5px] leading-normal text-ink-muted">{t("AI never moves money or changes your records. You can turn it off any time in AI settings.")}</p>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => onTurnOn(reads)}
            disabled={busy || readOnly}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-semibold text-primary-foreground hover:bg-emerald-hover disabled:opacity-50"
          >
            <Sparkles className="size-4.5" aria-hidden="true" />
            {busy ? t("Turning on...") : t("Turn on AI Insights")}
          </button>
          <Link href="/dashboard" className="self-center text-[13.5px] font-semibold text-ink-soft hover:text-ink">
            {t("Not now")}
          </Link>
        </div>
        <span className="text-center text-caption text-ink-faint">{t("Your own questions come soon. The suggested ones are answered from your records.")}</span>
      </section>
    </div>
  );
}
