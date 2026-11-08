"use client";

import { ArrowRight, ChevronRight, SendHorizontal, ShoppingBag, Sparkles, TrendingDown, Users, Utensils, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { answerOf, type AiWords, type AskKind, questionOf } from "@/lib/customer/aiInsightsDisplay";
import type { AiReport } from "@/lib/customer/aiInsightsTypes";
import { cn } from "@/lib/utils";

const ASKS: { kind: AskKind; Icon: LucideIcon; tile: string }[] = [
  { kind: "spend", Icon: Utensils, tile: "bg-tint-orange text-tint-orange-ink" },
  { kind: "cut", Icon: TrendingDown, tile: "bg-mint-50 text-brand-ink" },
  { kind: "afford", Icon: ShoppingBag, tile: "bg-tint-violet text-tint-violet-ink" },
  { kind: "owed", Icon: Users, tile: "bg-tint-blue text-tint-blue-ink" },
];

// The board's Ask AI panel. The suggested questions are answered from the
// report, the way the rules work them out; typing your own waits for the
// chat (`chat`), so until then the box says it is coming.
export function AskAi({ report, words, chat }: { report: AiReport; words: AiWords; chat: boolean }) {
  const { t } = words;
  const [asked, setAsked] = useState<AskKind[]>([]);
  const thread = useRef<HTMLDivElement>(null);
  const left = ASKS.filter((ask) => !asked.includes(ask.kind));

  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: "smooth" });
  }, [asked]);

  return (
    <section aria-labelledby="ai-ask" className="flex h-172.5 flex-col overflow-hidden rounded-[20px] border border-line-card bg-surface shadow-card lg:sticky lg:top-0 max-lg:h-140">
      <div className="flex items-center justify-between gap-2.5 border-b border-line-card px-4.5 py-4">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-emerald-soft text-emerald">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <h2 id="ai-ask" className="text-[16px] font-semibold whitespace-nowrap text-ink">
            {t("Ask AI")}
          </h2>
        </span>
      </div>
      <div ref={thread} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4.5 py-4">
        {asked.length === 0 && (
          <div className="flex flex-col gap-3.5 pt-1">
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold text-ink">{t("What would you like to know?")}</span>
              <span className="text-small leading-normal text-ink-muted">{t("Tap a question to see the answer from your records.")}</span>
            </div>
            <div className="flex flex-col gap-2">
              {ASKS.map((ask) => (
                <button key={ask.kind} type="button" onClick={() => setAsked([ask.kind])} className="flex items-center gap-3 rounded-[14px] border border-line-card bg-surface px-3.5 py-3 text-left hover:bg-row-hover">
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[10px]", ask.tile)}>
                    <ask.Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-[13.5px] leading-[1.4] font-medium text-ink">{questionOf(ask.kind, report, words)}</span>
                  <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}
        {asked.map((kind) => {
          const answer = answerOf(kind, report, words);
          const max = Math.max(1, ...answer.chart.map((bar) => bar.amount));
          return (
            <div key={kind} className="flex flex-col gap-3">
              <div className="max-w-[82%] self-end rounded-[16px_16px_4px_16px] bg-primary px-3.5 py-2.5 text-body leading-[1.45] text-primary-foreground">{questionOf(kind, report, words)}</div>
              <div className="flex max-w-full items-start gap-2">
                <span className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-emerald-soft text-emerald">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2.5 rounded-[4px_16px_16px_16px] bg-surface-sunken px-3.5 py-3 text-body leading-normal text-ink">
                  {answer.lines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                  {answer.bullets.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {answer.bullets.map((bullet) => (
                        <div key={bullet} className="flex gap-2">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                          <span>{bullet}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {answer.chart.length > 0 && (
                    <div className="flex flex-col gap-1.75 rounded-[12px] bg-surface px-3 py-2.5">
                      {answer.chart.map((bar) => (
                        <div key={bar.label} className="grid grid-cols-[92px_minmax(0,1fr)_74px] items-center gap-2 text-[12.5px]">
                          <span className="truncate text-ink-soft">{bar.label}</span>
                          <span className="h-2 overflow-hidden rounded-full bg-line-card">
                            <span className={cn("block h-full rounded-full", bar.highest ? "bg-tint-orange-ink" : "bg-primary")} style={{ width: `${Math.round((bar.amount / max) * 100)}%` }} />
                          </span>
                          <span className="text-right font-semibold tabular-nums">{bar.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {answer.note && <span className="text-small text-ink-soft">{answer.note}</span>}
                  {answer.link && (
                    <Link href={answer.link.href} className="flex items-center gap-1.25 self-start text-small font-semibold text-emerald hover:text-emerald-hover">
                      {t(answer.link.label)}
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-2.5 border-t border-line-card px-4.5 pt-3 pb-4">
        {asked.length > 0 && left.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {left.map((ask) => (
              <button key={ask.kind} type="button" onClick={() => setAsked((now) => [...now, ask.kind])} className="h-7.5 rounded-full border border-line-card bg-surface px-2.75 text-[12.5px] font-medium whitespace-nowrap text-ink-2 hover:bg-row-hover">
                {questionOf(ask.kind, report, words)}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            disabled={!chat}
            aria-label={t("Ask about your money")}
            placeholder={chat ? t("Ask a question, e.g. how much on rent this year?") : t("Typing your own question comes soon")}
            className="h-11 min-w-0 flex-1 rounded-[12px] border border-input bg-surface px-3.5 text-body text-ink placeholder:text-ink-faint disabled:bg-table-head"
          />
          <button type="button" disabled={!chat} aria-label={t("Send")} title={t("Send")} className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-primary/45 text-primary-foreground">
            <SendHorizontal className="size-4.5" aria-hidden="true" />
          </button>
        </div>
        <span className="text-[11.5px] text-ink-faint">{t("AI can make mistakes. Check big decisions against your records.")}</span>
      </div>
    </section>
  );
}
