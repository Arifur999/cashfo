"use client";

import Link from "next/link";
import { useState } from "react";
import PageFrame from "@/components/smartly/PageFrame";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { INVESTMENT_SORTS, listInvestments, percentText, totalsOf, type InvestmentSort, type InvestmentTab } from "@/lib/customer/investmentDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BTN_PRIMARY, BTN_SECONDARY, CARD, Glyph, IC, ICON_BTN, KIND_LOOK, KindTile, NAME_LINK } from "./investmentLook";
import { useInvestments } from "./InvestmentsProvider";
import { Kpi, SearchBox, Tabs } from "./listUi";
import { StatusChip, usePlanText } from "./statusText";

const SORT_LABELS: Record<InvestmentSort, string> = {
  capital: "Most invested first",
  profit: "Most profit first",
  ret: "Best return first",
  next: "Next payout first",
  newest: "Newest first",
};

export const LIST_COLS = "grid grid-cols-[minmax(0,1fr)_124px_120px_76px_168px_150px_84px] items-center gap-x-3.5";
const MENU_ITEM = "min-h-10 rounded-[8px] px-2.5 text-[13.5px] gap-2.5";

// Investments › My investments (the InvestList board): the totals, then
// every investment with its capital, profit, return, payout plan and next
// payout, by tab, search and sort, each with its actions.
export function InvestListClient() {
  const { t, fmt } = useLocale();
  const { figures, today, money, day, openNew, openEntry, openEdit, openClose, askDelete, reopen, statementHref } = useInvestments();
  const plan = usePlanText();
  const [tab, setTab] = useState<InvestmentTab>("active");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<InvestmentSort>("capital");
  const totals = totalsOf(figures, today);
  const rows = listInvestments(figures, tab, q, sort, (kind) => t(KIND_LOOK[kind].label));
  const active = figures.filter((f) => !f.closed);
  const lateOnes = active.filter((f) => f.status === "late");

  const kpis = [
    { label: t("Invested now"), value: money(totals.capital), sub: t("In {count} active investments", { count: formatCount(active.length, fmt) }), tone: "text-ink" },
    { label: t("Profit received@@total"), value: money(totals.profit), sub: t("Since you started"), tone: "text-tint-green-ink" },
    { label: t("Capital taken back"), value: money(totals.back), sub: t("From closed or partly taken out"), tone: "text-ink" },
    {
      label: t("Late payouts"),
      value: formatCount(totals.latePayouts, fmt),
      sub: lateOnes.length ? lateOnes.map((f) => f.investment.name).join(", ") : t("All payouts on time"),
      tone: lateOnes.length ? "text-loss-ink" : "text-tint-green-ink",
    },
  ];
  const tabs: { key: InvestmentTab; label: string; count: number }[] = [
    { key: "active", label: t("Active"), count: active.length },
    { key: "closed", label: t("Closed"), count: figures.length - active.length },
    { key: "all", label: t("All"), count: figures.length },
  ];
  const needle = q.trim();
  const empty = !rows.length
    ? !figures.length
      ? { title: t("No investments yet"), body: t("Add money you put into a business, a sanchayapatra, an FDR or anything that pays you profit. Then record each profit when it comes.") }
      : needle
        ? { title: t("Nothing matches “{search}”", { search: needle }), body: t("Check the spelling or clear the search.") }
        : { title: tab === "closed" ? t("No closed investments") : t("No active investments"), body: t("Switch the tab above to see the others.") }
    : null;

  return (
    <PageFrame className="gap-[18px] leading-[normal] md:pt-6 md:pb-8">
      <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
        {kpis.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </div>
      <section aria-label={t("Your investments")} className={cn(CARD, "flex min-h-90 flex-col overflow-hidden lg:h-[calc(100dvh-231px)]")}>
        <div className="flex shrink-0 items-center gap-3 px-5 py-3.5 max-lg:flex-wrap">
          <Tabs label={t("Show investments")} tabs={tabs} value={tab} onChange={setTab} />
          <SearchBox value={q} onChange={setQ} label={t("Search by name or kind")} />
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(BTN_SECONDARY, "h-9.5 rounded-[10px] text-[13px] font-medium")}>
              <Glyph d={IC.sort} size={15} className="text-ink-muted" />
              {t(SORT_LABELS[sort])}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} aria-label={t("Sort by")} className="w-57.5 rounded-[12px] border border-line-card p-1.5 shadow-[0_12px_32px_rgba(18,32,29,0.14)]">
              {INVESTMENT_SORTS.map((key) => {
                const on = key === sort;
                return (
                  <DropdownMenuItem key={key} onSelect={() => setSort(key)} className={cn("min-h-10 justify-between rounded-[8px] px-2.5 text-[13.5px] text-ink", on ? "font-semibold" : "font-medium")}>
                    {t(SORT_LABELS[key])}
                    {on && <Glyph d={IC.check} size={15} stroke={2.5} className="text-emerald" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <button type="button" onClick={openNew} className={cn(BTN_PRIMARY, "h-9.5")}>
            <Glyph d={IC.plus} size={15} stroke={2.5} />
            {t("New investment")}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto [scrollbar-width:thin]">
          <div className="flex min-h-full min-w-240 flex-col">
            <div className={cn(LIST_COLS, "sticky top-0 z-[1] border-y border-line bg-strip px-5 py-2.5 text-[12px] font-semibold text-ink-muted")}>
              <span>{t("Investment")}</span>
              <span className="text-right">{t("Invested now")}</span>
              <span className="text-right">{t("Profit received@@column")}</span>
              <span className="text-right">{t("Return/yr")}</span>
              <span>{t("Payout plan")}</span>
              <span>{t("Next payout")}</span>
              <span className="text-right">{t("Actions")}</span>
            </div>
            {rows.map((c) => {
              const inv = c.investment;
              const look = KIND_LOOK[inv.kind];
              const open = !c.closed;
              const nextText = c.closed ? day(inv.closedAt ?? "") : c.next ? day(c.next) : c.last ? t("Last {date}", { date: day(c.last.date) }) : "";
              return (
                <div key={inv.id} className={cn(LIST_COLS, "min-h-16 border-b border-card-rule px-5 py-2 text-[14px] tabular-nums transition-colors hover:bg-strip", c.closed && "opacity-[0.78]")}>
                  <span className="flex min-w-0 items-center gap-3">
                    <KindTile kind={inv.kind} size={36} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <Link href={statementHref(inv.id)} data-i18n-skip="" className={cn(NAME_LINK, "font-semibold")}>
                        {inv.name}
                      </Link>
                      <span className={cn("truncate text-[12px] font-semibold", look.tile.split(" ").find((c2) => c2.startsWith("text-")))}>{t(look.short)}</span>
                    </span>
                  </span>
                  <span className="text-right font-semibold whitespace-nowrap">{money(c.capital)}</span>
                  <span className="text-right whitespace-nowrap text-tint-green-ink">{money(c.profit)}</span>
                  <span className="text-right whitespace-nowrap">{percentText(c.ret)}</span>
                  <span className="text-[12.5px] leading-[1.35] text-ink-2">{plan(c)}</span>
                  <span className="flex min-w-0 flex-col items-start gap-0.75">
                    <StatusChip figures={c} />
                    {nextText && <span className="text-[11.5px] whitespace-nowrap text-ink-muted">{nextText}</span>}
                  </span>
                  <span className="flex justify-end gap-1.5">
                    {open && (
                      <button type="button" onClick={() => openEntry("PROFIT", inv.id)} title={t("Record profit")} aria-label={t("Record profit for {name}", { name: inv.name })} className={ICON_BTN}>
                        <Glyph d={IC.coins} size={15} />
                      </button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger title={t("More actions")} aria-label={t("More actions for {name}", { name: inv.name })} className={ICON_BTN}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <circle cx="5" cy="12" r="1.7" />
                          <circle cx="12" cy="12" r="1.7" />
                          <circle cx="19" cy="12" r="1.7" />
                        </svg>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" sideOffset={6} className="w-57 rounded-[12px] border border-line-card p-1.5 shadow-[0_12px_32px_rgba(18,32,29,0.16)]">
                        <DropdownMenuItem asChild className={cn(MENU_ITEM, "text-ink")}>
                          <Link href={statementHref(inv.id)}>
                            <Glyph d={IC.file} size={15} />
                            {t("Open statement")}
                          </Link>
                        </DropdownMenuItem>
                        {open && (
                          <>
                            <DropdownMenuItem onSelect={() => openEntry("PROFIT", inv.id)} className={cn(MENU_ITEM, "text-ink")}>
                              <Glyph d={IC.coins} size={15} />
                              {t("Record profit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openEntry("ADD", inv.id)} className={cn(MENU_ITEM, "text-ink")}>
                              <Glyph d={IC.plus} size={15} />
                              {t("Invest more")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openEntry("BACK", inv.id)} className={cn(MENU_ITEM, "text-ink")}>
                              <Glyph d={IC.back} size={15} />
                              {t("Take capital back")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openEntry("LOSS", inv.id)} className={cn(MENU_ITEM, "text-ink")}>
                              <Glyph d={IC.down} size={15} />
                              {t("Record a loss")}
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onSelect={() => openEdit(inv.id)} className={cn(MENU_ITEM, "text-ink")}>
                          <Glyph d={IC.edit} size={15} />
                          {t("Edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => (open ? openClose(inv.id) : reopen(inv.id))} className={cn(MENU_ITEM, "text-ink")}>
                          <Glyph d={open ? IC.lock : IC.open} size={15} />
                          {open ? t("Close investment") : t("Reopen")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => askDelete({ kind: "investment", id: inv.id })} className={cn(MENU_ITEM, "text-loss-ink")}>
                          <Glyph d={IC.trash} size={15} />
                          {t("Delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </div>
              );
            })}
            {empty && (
              <div className="flex flex-col items-center gap-2.5 px-6 py-12 text-center">
                <span className="text-[15px] font-semibold">{empty.title}</span>
                <span className="max-w-105 text-[13px] leading-[1.5] text-ink-muted">{empty.body}</span>
                {needle && (
                  <button type="button" onClick={() => setQ("")} className={BTN_SECONDARY}>
                    {t("Clear search")}
                  </button>
                )}
                {!figures.length && (
                  <button type="button" onClick={openNew} className={BTN_PRIMARY}>
                    {t("New investment")}
                  </button>
                )}
              </div>
            )}
            {rows.length > 1 && (
              <div className={cn(LIST_COLS, "sticky bottom-0 mt-auto min-h-12.5 shrink-0 border-t border-line bg-strip px-5 py-2 text-[14px] font-semibold tabular-nums")}>
                <span>{t("Total · {count} investments", { count: formatCount(rows.length, fmt) })}</span>
                <span className="text-right whitespace-nowrap">{money(rows.reduce((s, c) => s + c.capital, 0))}</span>
                <span className="text-right whitespace-nowrap text-tint-green-ink">{money(rows.reduce((s, c) => s + c.profit, 0))}</span>
                <span />
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
        </div>
      </section>
    </PageFrame>
  );
}
