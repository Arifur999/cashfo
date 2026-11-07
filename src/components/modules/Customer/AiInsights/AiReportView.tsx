"use client";

import { ArrowRight, Car, Check, CircleCheck, ShoppingBag, ShoppingCart, PiggyBank, TrendingDown, TrendingUp, Users, Utensils, Wheat, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { type AiWords, HAPPENING_TAG, happeningText, heroText, todoLink, todoText, wayText } from "@/lib/customer/aiInsightsDisplay";
import type { AiHappening, AiReport, AiTodo, AiWayTip } from "@/lib/customer/aiInsightsTypes";
import { cn } from "@/lib/utils";

const TODO_LOOK: Record<AiTodo["kind"], { Icon: LucideIcon; tile: string }> = {
  budget: { Icon: ShoppingBag, tile: "bg-warning-soft text-warning" },
  bill: { Icon: Zap, tile: "bg-tint-blue text-tint-blue-ink" },
  goal: { Icon: PiggyBank, tile: "bg-expense-soft text-expense" },
  owed: { Icon: Users, tile: "bg-tint-blue text-tint-blue-ink" },
};

const TONE: Record<AiHappening["tone"], string> = {
  good: "bg-mint-50 text-brand-ink",
  watch: "bg-warning-soft text-warning",
  info: "bg-tint-blue text-tint-blue-ink",
};

const WAY_LOOK: Record<AiWayTip, { Icon: LucideIcon; tile: string }> = {
  eatOut: { Icon: Utensils, tile: "bg-tint-orange text-tint-orange-ink" },
  ride: { Icon: Car, tile: "bg-tint-blue text-tint-blue-ink" },
  bulk: { Icon: Wheat, tile: "bg-warning-soft text-warning" },
  list: { Icon: ShoppingCart, tile: "bg-tint-violet text-tint-violet-ink" },
  power: { Icon: Zap, tile: "bg-tint-yellow text-tint-yellow-ink" },
  less: { Icon: TrendingDown, tile: "bg-mint-50 text-brand-ink" },
};

const CARD = "flex flex-col gap-1 rounded-[20px] border border-line-card bg-surface px-6 pt-5 pb-3 shadow-card max-sm:px-4";

// The left of the AIInsights board: last month's summary on the forest
// card, What to do next (ticked off here), What happened, Easy ways to save.
export function AiReportView({ report, words, done, onToggle }: { report: AiReport; words: AiWords; done: Set<string>; onToggle: (key: string) => void }) {
  const { t, money, count } = words;
  const hero = heroText(report.summary, report.todos.length, words);
  const doneCount = report.todos.filter((todo) => done.has(todo.key)).length;
  const waysTotal = report.ways.reduce((sum, way) => sum + way.perMonth, 0);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section aria-labelledby="ai-hero" className="flex flex-col gap-4.5 rounded-[20px] bg-ai-hero px-6 py-5.5 text-white max-sm:px-4">
        <div className="flex items-start gap-3.5">
          <span className="flex size-11.5 shrink-0 items-center justify-center rounded-[14px] bg-white/14">
            {report.summary.kept < 0 ? <TrendingDown className="size-5" aria-hidden="true" /> : <TrendingUp className="size-5" aria-hidden="true" />}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[12.5px] font-semibold text-hero-sage">{hero.kicker}</span>
            <h2 id="ai-hero" className="text-[22px] leading-[1.3] font-semibold tracking-[-0.01em] text-white">
              {hero.title}
            </h2>
            <p className="text-body leading-normal text-hero-mist">{hero.sub}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {hero.tiles.map((tile) => (
            <div key={tile.label} className="flex min-w-0 flex-col gap-[3px] rounded-[14px] bg-white/10 px-3.5 py-3">
              <span className="text-[12.5px] text-hero-sage">{tile.label}</span>
              <span className="text-[20px] font-bold tracking-[-0.01em] text-white tabular-nums">{tile.value}</span>
              <span className="truncate text-caption text-hero-mist">{tile.sub}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="ai-todo" className={CARD}>
        <div className="flex items-center justify-between gap-3 pb-2">
          <span className="flex flex-col gap-0.5">
            <h2 id="ai-todo" className="text-[16px] font-semibold text-ink">
              {t("What to do next")}
            </h2>
            <span className="text-small text-ink-muted">{report.todos.length ? t("Tick each one off when it's done.") : t("Nothing needs your attention right now.")}</span>
          </span>
          {report.todos.length > 0 && (
            <span className="flex items-center gap-2.5">
              <span className="text-small font-semibold whitespace-nowrap text-ink-2">{t("{done} of {count} done", { done: count(doneCount), count: count(report.todos.length) })}</span>
              <span aria-hidden="true" className="h-1.5 w-22.5 overflow-hidden rounded-full bg-line-card">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round((doneCount / report.todos.length) * 100)}%` }} />
              </span>
            </span>
          )}
        </div>
        {report.todos.map((todo) => {
          const isDone = done.has(todo.key);
          const look = TODO_LOOK[todo.kind];
          const text = todoText(todo, words);
          const link = todoLink(todo);
          return (
            <div key={todo.key} className={cn("flex items-center gap-3.5 border-t border-divider py-3", isDone && "opacity-60")}>
              <button
                type="button"
                role="checkbox"
                aria-checked={isDone}
                onClick={() => onToggle(todo.key)}
                aria-label={t(isDone ? "Mark as not done" : "Mark as done")}
                title={t(isDone ? "Mark as not done" : "Mark as done")}
                className={cn("flex size-6.5 shrink-0 items-center justify-center rounded-full", isDone ? "bg-primary text-primary-foreground" : "border-2 border-input bg-surface hover:border-emerald")}
              >
                {isDone && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
              </button>
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px]", isDone ? "bg-surface-sunken text-ink-faint" : look.tile)}>
                <look.Icon className="size-4.5" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={cn("text-[14.5px] font-semibold text-ink", isDone && "line-through")}>{text.title}</span>
                <span className="text-small text-ink-muted">{text.text}</span>
              </span>
              {!isDone && (
                <Link href={link.href} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-emerald-soft px-3.5 text-small font-semibold whitespace-nowrap text-emerald hover:bg-mint-50 max-sm:hidden">
                  {t(link.label)}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>
          );
        })}
        {report.todos.length > 0 && doneCount === report.todos.length && (
          <div className="mt-1 mb-2 flex items-center gap-2.5 rounded-[12px] bg-emerald-wash px-3.5 py-3 text-body text-brand-ink">
            <CircleCheck className="size-4.5" aria-hidden="true" />
            {t("All done for this month. Nice work.")}
          </div>
        )}
      </section>

      <section aria-labelledby="ai-happened" className={CARD}>
        <h2 id="ai-happened" className="pb-2 text-[16px] font-semibold text-ink">
          {t("What happened this month")}
        </h2>
        {report.happened.map((row) => (
          <div key={`${row.kind}:${row.tone}`} className="flex items-start gap-3 border-t border-divider py-2.75">
            <span className={cn("w-23 shrink-0 rounded-full py-[3px] text-center text-caption font-semibold", TONE[row.tone])}>{t(HAPPENING_TAG[row.tone])}</span>
            <span className="text-body leading-[1.55] text-ink-2">{happeningText(row, words)}</span>
          </div>
        ))}
        {report.happened.length === 0 && <p className="border-t border-divider py-3 text-body text-ink-muted">{t("Nothing stood out last month.")}</p>}
      </section>

      {report.ways.length > 0 && (
        <section aria-labelledby="ai-save" className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 id="ai-save" className="text-[16px] font-semibold text-ink">
              {t("Easy ways to save")}
            </h2>
            <span className="text-small font-semibold text-emerald">{t("About {amount} a month", { amount: money(waysTotal) })}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {report.ways.map((way) => {
              const look = WAY_LOOK[way.tip];
              return (
                <div key={way.key} className="flex flex-col gap-2.5 rounded-[16px] border border-line-card bg-surface p-4">
                  <span className={cn("flex size-8.5 items-center justify-center rounded-[10px]", look.tile)}>
                    <look.Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-body leading-[1.45] text-ink-2">{wayText(way, words)}</span>
                  <span className="self-start rounded-full bg-mint-50 px-2.5 py-[3px] text-[12.5px] font-semibold whitespace-nowrap text-brand-ink">{t("About {amount} a month", { amount: money(way.perMonth) })}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

