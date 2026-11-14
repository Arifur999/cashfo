"use client";

import Link from "next/link";
import PageFrame from "@/components/smartly/PageFrame";
import { monthStrip, percentText, profitByMonth, totalsOf, watchList } from "@/lib/customer/investmentDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BTN_PRIMARY, BTN_SECONDARY, CARD, Chip, Glyph, IC, KIND_LOOK, KindTile, NAME_LINK, STATUS_CHIP } from "./investmentLook";
import { useInvestments } from "./InvestmentsProvider";
import { NextPayout, StatusChip } from "./statusText";

// Investments › Dashboard (the InvestDashboard board): this month's
// payouts, the totals, payouts to watch, profit by month and every active
// investment as a card.
export function InvestDashboardClient() {
  const { t, fmt } = useLocale();
  const { figures, investments, today, money, day, openNew, openEntry, openClose, statementHref } = useInvestments();
  const strip = monthStrip(figures, today);
  const totals = totalsOf(figures, today);
  const watch = watchList(figures, today);
  const bars = profitByMonth(investments, today);
  const barMax = Math.max(1, ...bars.map((b) => b.profit));
  const barTotal = bars.reduce((s, b) => s + b.profit, 0);
  const best = bars.reduce((top, b) => (b.profit > top.profit ? b : top), bars[0]);
  const monthName = (month: string, pattern = "MMM") => day(`${month}-01`, pattern);
  const active = figures.filter((f) => !f.closed).sort((a, b) => b.capital - a.capital || a.investment.createdAt.localeCompare(b.investment.createdAt));
  const recordAny = () => {
    const pick = strip.late[0] ?? strip.next ?? active[0];
    openEntry("PROFIT", pick?.investment.id ?? "");
  };

  const stripItems = [
    { label: t("Expected"), value: money(strip.expected), tone: "text-ink" },
    { label: t("Received"), value: money(strip.received) + (strip.toCome ? ` · ${t("{amount} to come", { amount: money(strip.toCome) })}` : ""), tone: "text-tint-green-ink" },
    { label: t("Next payout"), value: strip.next ? `${day(strip.next.next, "d MMM")} · ${strip.next.investment.name}` : "–", tone: "text-ink" },
    {
      label: t("Late"),
      value: strip.late.length ? t(strip.late.length === 1 ? "{count} investment" : "{count} investments", { count: formatCount(strip.late.length, fmt) }) : t("None"),
      tone: strip.late.length ? "text-loss-ink" : "text-tint-green-ink",
    },
  ];

  const kpis = [
    {
      label: t("Invested now"),
      value: money(totals.capital),
      sub: t("{active} active · {closed} closed", { active: formatCount(totals.activeCount, fmt), closed: formatCount(totals.closedCount, fmt) }),
      icon: IC.wallet,
      tile: "bg-mint-50 text-emerald",
      tone: "text-ink",
    },
    { label: t("Profit received@@total"), value: money(totals.profit), sub: t("This year {amount}", { amount: money(totals.profitThisYear) }), icon: IC.coins, tile: "bg-tint-green text-tint-green-ink", tone: "text-tint-green-ink" },
    { label: t("Expected a year"), value: money(totals.yearly), sub: t("From fixed-plan payouts"), icon: IC.clock, tile: "bg-warning-soft text-warning", tone: "text-ink" },
    { label: t("Average return"), value: t("{rate} a year", { rate: percentText(totals.averageReturn) }), sub: t("Profit received on what you put in"), icon: IC.trend, tile: "bg-tint-blue text-tint-blue-ink", tone: "text-ink" },
  ];

  return (
    <PageFrame className="gap-[18px] leading-[normal] md:pt-6 md:pb-8">
      <div className="flex items-center gap-3 max-lg:flex-wrap">
        <div
          role="group"
          aria-label={t("This month at a glance")}
          className="flex h-14 min-w-0 flex-1 items-center gap-[18px] overflow-hidden rounded-[16px] border border-line-card bg-surface px-[18px] whitespace-nowrap tabular-nums max-lg:basis-full max-md:h-auto max-md:flex-wrap max-md:gap-3 max-md:py-3"
        >
          <span className="flex shrink-0 items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-[10px] bg-surface-sunken text-ink-muted">
              <Glyph d={IC.calendar} />
            </span>
            <span className="flex flex-col gap-px">
              <span className="text-[13px] font-semibold text-ink">
                {t("This month")} · {monthName(today.slice(0, 7), "MMM yyyy")}
              </span>
              <span className="text-[11.5px] text-ink-muted">{t("Profit from your investments")}</span>
            </span>
          </span>
          <span className="h-7 w-px shrink-0 bg-line max-md:hidden" />
          {stripItems.map((item) => (
            <span key={item.label} className="flex min-w-0 shrink-0 flex-col gap-px">
              <span className="text-[11.5px] text-ink-muted">{item.label}</span>
              <span data-i18n-skip="" className={cn("max-w-62.5 truncate text-[13.5px] font-semibold", item.tone)}>
                {item.value}
              </span>
            </span>
          ))}
        </div>
        <button type="button" onClick={recordAny} disabled={!active.length} className={BTN_SECONDARY}>
          <Glyph d={IC.coins} />
          {t("Record profit")}
        </button>
        <button type="button" onClick={openNew} className={BTN_PRIMARY}>
          <Glyph d={IC.plus} stroke={2.5} />
          {t("New investment")}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
        {kpis.map((k) => (
          <div key={k.label} className={cn(CARD, "flex min-w-0 flex-col gap-1.5 px-5 py-4")}>
            <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-2">
              <span className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-[9px]", k.tile)}>
                <Glyph d={k.icon} size={15} />
              </span>
              {k.label}
            </span>
            <span className={cn("truncate text-[24px] font-bold tracking-[-0.02em] tabular-nums", k.tone)}>{k.value}</span>
            <span className="truncate text-[12.5px] text-ink-muted">{k.sub}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-stretch gap-4 max-lg:grid-cols-1">
        <section aria-labelledby="iv-watch-h" className={cn(CARD, "flex min-w-0 flex-col")}>
          <div className="px-5.5 pt-[18px] pb-3">
            <h2 id="iv-watch-h" className="m-0 text-[16px] font-bold text-ink">
              {t("Payouts to watch")}
            </h2>
            <p className="m-0 mt-0.75 text-[12.5px] text-ink-muted">{t("Late ones first, then what comes in the next 45 days")}</p>
          </div>
          <div className="flex flex-col px-3 pb-3">
            {watch.slice(0, 6).map((w) => {
              const inv = w.figures.investment;
              const matured = w.rank === 0;
              const sub = matured
                ? t("Matured on {date} · {amount} to take back", { date: day(w.day), amount: money(w.figures.capital) })
                : (w.rank === 1 ? t("Was due {date}", { date: day(w.day) }) : day(w.day)) + (w.figures.per ? ` · ${money(w.figures.per)}` : "");
              return (
                <div key={inv.id} className="flex min-h-[69px] items-center gap-3 rounded-[12px] border-b border-head-rule p-2.5">
                  <KindTile kind={inv.kind} size={38} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span data-i18n-skip="" className="truncate text-[14px] font-semibold text-ink">
                      {inv.name}
                    </span>
                    <span className="truncate text-[12.5px] text-ink-muted">{sub}</span>
                  </span>
                  {w.rank === 2 ? (
                    <Chip className={w.daysLeft <= 7 ? STATUS_CHIP.soon : STATUS_CHIP.ok}>
                      {w.daysLeft <= 0 ? t("Due today") : w.daysLeft === 1 ? t("Tomorrow") : t("In {count} days", { count: formatCount(w.daysLeft, fmt) })}
                    </Chip>
                  ) : (
                    <StatusChip figures={w.figures} />
                  )}
                  <button type="button" onClick={() => (matured ? openClose(inv.id) : openEntry("PROFIT", inv.id))} className={cn(BTN_SECONDARY, "h-8.5 px-3 text-[13px]")}>
                    {matured ? t("Close") : t("Record")}
                  </button>
                </div>
              );
            })}
            {!watch.length && <div className="px-4 py-7 text-center text-[13px] text-ink-muted">{t("Nothing due right now. All payouts are on time.")}</div>}
          </div>
        </section>

        <section aria-labelledby="iv-chart-h" className={cn(CARD, "flex min-w-0 flex-col")}>
          <div className="px-5.5 pt-[18px] pb-1.5">
            <h2 id="iv-chart-h" className="m-0 text-[16px] font-bold text-ink">
              {t("Profit by month")}
            </h2>
            <p className="m-0 mt-0.75 text-[12.5px] text-ink-muted">{t("Last 12 months · {amount} in all", { amount: money(barTotal) })}</p>
          </div>
          <div role="img" aria-label={t("Bar chart of profit received each month")} className="grid min-h-47.5 flex-auto grid-cols-12 items-end gap-2 px-5.5 pt-3.5 pb-2">
            {bars.map((b) => (
              <span key={b.month} title={`${monthName(b.month, "MMM yyyy")}: ${money(b.profit)}`} className="flex h-full min-w-0 flex-col items-center justify-end gap-1.5">
                <span className={cn("min-h-0.75 w-full max-w-7.5 rounded-[7px_7px_3px_3px]", b.current ? "bg-emerald" : "bg-mint-200")} style={{ height: `${((b.profit / barMax) * 100).toFixed(1)}%` }} />
                <span className={cn("text-[11px] whitespace-nowrap", b.current ? "font-bold text-ink" : "font-medium text-ink-muted")}>{monthName(b.month)}</span>
              </span>
            ))}
          </div>
          <div className="flex justify-between gap-2.5 border-t border-head-rule px-5.5 pt-2.5 pb-4 text-[12.5px] text-ink-muted tabular-nums">
            <span>{t("Best month {month}", { month: best.profit > 0 ? `${monthName(best.month)} · ${money(best.profit)}` : "–" })}</span>
            <span>{t("Monthly average {amount}", { amount: money(Math.round(barTotal / 12)) })}</span>
          </div>
        </section>
      </div>

      <section aria-labelledby="iv-cards-h" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="iv-cards-h" className="m-0 text-[16px] font-bold text-ink">
            {t("Your investments")} <span className="font-medium text-ink-faint">{formatCount(active.length, fmt)}</span>
          </h2>
          <Link href="/investments/list" className="text-[13px] font-semibold text-emerald no-underline hover:underline">
            {t("See all")}
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4 max-xl:grid-cols-2 max-md:grid-cols-1">
          {active.map((c) => {
            const inv = c.investment;
            const look = KIND_LOOK[inv.kind];
            return (
              <article key={inv.id} className={cn(CARD, "flex min-w-0 flex-col gap-3.5 px-5 py-[18px]")}>
                <div className="flex items-start gap-3">
                  <KindTile kind={inv.kind} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link href={statementHref(inv.id)} data-i18n-skip="" className={cn(NAME_LINK, "text-[14.5px] font-bold")}>
                      {inv.name}
                    </Link>
                  </span>
                  <Chip className={look.tile}>{t(look.short)}</Chip>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12px] text-ink-muted">{t("Capital invested now")}</span>
                  <span className="text-[22px] font-bold tracking-[-0.02em] tabular-nums">{money(c.capital)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 rounded-[12px] bg-strip px-3.5 py-3 tabular-nums">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[11.5px] text-ink-muted">{t("Profit so far")}</span>
                    <span className="text-[14px] font-semibold whitespace-nowrap text-tint-green-ink">{money(c.profit)}</span>
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[11.5px] text-ink-muted">{t("Return a year")}</span>
                    <span className="text-[14px] font-semibold whitespace-nowrap">{percentText(c.ret)}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2.5">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[11.5px] text-ink-muted">{c.step ? t("Next payout") : t("Payouts@@investment")}</span>
                    <span className="truncate text-[13px] font-semibold">
                      <NextPayout figures={c} />
                    </span>
                  </span>
                  <StatusChip figures={c} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEntry("PROFIT", inv.id)} className={cn(BTN_SECONDARY, "h-9.5 flex-1 justify-center text-[13px]")}>
                    {t("Record profit")}
                  </button>
                  <Link href={statementHref(inv.id)} className={cn(BTN_SECONDARY, "h-9.5 text-[13px]")}>
                    {t("Statement")}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
        {!investments.length && (
          <div className={cn(CARD, "flex flex-col items-center gap-2.5 px-6 py-10 text-center")}>
            <span className="flex size-13 items-center justify-center rounded-[16px] bg-mint-50 text-emerald">
              <Glyph d={IC.trend} size={24} />
            </span>
            <span className="text-[16px] font-bold">{t("No investments yet")}</span>
            <span className="max-w-115 text-[13.5px] leading-[1.55] text-ink-muted">{t("Add money you put into a business, a sanchayapatra, an FDR or anything that pays you profit. Then record each profit when it comes.")}</span>
            <button type="button" onClick={openNew} className={cn(BTN_PRIMARY, "mt-1")}>
              {t("New investment")}
            </button>
          </div>
        )}
      </section>
    </PageFrame>
  );
}
