"use client";

import Link from "next/link";
import { useState } from "react";
import PageFrame from "@/components/smartly/PageFrame";
import { dayOf, ENTRY_SIGN, ENTRY_TABS, entryInTab, entryRows, sumOf, type EntryTab } from "@/lib/customer/investmentDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BTN_PRIMARY, CARD, Chip, ENTRY_LOOK, Glyph, IC, ICON_BTN, NAME_LINK } from "./investmentLook";
import { useInvestments } from "./InvestmentsProvider";
import { Kpi, SearchBox, Tabs } from "./listUi";

const COLS = "grid grid-cols-[104px_minmax(0,1fr)_128px_140px_minmax(0,0.8fr)_136px_84px] items-center gap-x-3.5";
const TAB_LABELS: Record<EntryTab, string> = { all: "All", profit: "Profit@@investment", invest: "Invested", back: "Capital back", loss: "Loss" };

// Investments › Transactions (the InvestTransactions board): every entry of
// every investment, by type, investment and search, with the totals of what
// is listed.
export function InvestTransactionsClient() {
  const { t, fmt } = useLocale();
  const { investments, figures, money, day, walletName, openEntry, openEditEntry, askDelete, statementHref } = useInvestments();
  const [tab, setTab] = useState<EntryTab>("all");
  const [ivId, setIvId] = useState("");
  const [q, setQ] = useState("");
  const base = entryRows(investments, investments.some((inv) => inv.id === ivId) ? ivId : "");
  const needle = q.trim().toLowerCase();
  const rows = base
    .filter((row) => entryInTab(row.entry, tab))
    .filter((row) => !needle || `${row.investment.name} ${row.entry.note ?? ""} ${walletName(row.entry.accountId)}`.toLowerCase().includes(needle));
  const profit = sumOf(rows, ["PROFIT"]);
  const invested = sumOf(rows, ["INVEST", "ADD"]);
  const back = sumOf(rows, ["BACK"]);
  const loss = sumOf(rows, ["LOSS"]);
  const kpis = [
    { label: t("Profit received@@column"), value: money(profit), sub: t("In the list below"), tone: "text-tint-green-ink" },
    { label: t("Money invested"), value: money(invested), sub: t("First amount and top-ups"), tone: "text-ink" },
    { label: t("Capital back"), value: money(back), sub: t("Money that came back to you"), tone: "text-tint-blue-ink" },
    { label: t("Loss"), value: money(loss), sub: t("Capital that is gone"), tone: loss ? "text-loss-ink" : "text-ink" },
  ];
  const tabs = ENTRY_TABS.map((key) => ({ key, label: t(TAB_LABELS[key]), count: base.filter((row) => entryInTab(row.entry, key)).length }));
  const options = [...figures].sort((a, b) => Number(a.closed) - Number(b.closed) || a.investment.name.localeCompare(b.investment.name));
  const newEntry = () => openEntry("PROFIT", ivId || figures.find((f) => !f.closed)?.investment.id || "");

  return (
    <PageFrame className="gap-[18px] leading-[normal] md:pt-6 md:pb-8">
      <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
        {kpis.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </div>
      <section aria-label={t("Investment transactions")} className={cn(CARD, "flex min-h-95 flex-col overflow-hidden lg:h-[calc(100dvh-231px)]")}>
        <div className="flex shrink-0 flex-wrap items-center gap-3 px-5 py-3.5">
          <Tabs label={t("Entry type")} tabs={tabs} value={tab} onChange={setTab} />
          <select
            value={ivId}
            onChange={(event) => setIvId(event.target.value)}
            aria-label={t("All investments")}
            className="select-chevron h-9.5 w-57.5 cursor-pointer rounded-[10px] border border-input bg-surface pl-3 text-[14px] text-ink outline-none focus:border-emerald max-sm:w-full"
          >
            <option value="">{t("All investments")}</option>
            {options.map((f) => (
              <option key={f.investment.id} value={f.investment.id}>
                {f.investment.name + (f.closed ? ` ${t("(closed)")}` : "")}
              </option>
            ))}
          </select>
          <SearchBox value={q} onChange={setQ} label={t("Search notes, names or accounts")} />
          <button type="button" onClick={newEntry} disabled={!figures.some((f) => !f.closed)} className={cn(BTN_PRIMARY, "h-9.5")}>
            <Glyph d={IC.plus} size={15} stroke={2.5} />
            {t("New entry")}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto [scrollbar-width:thin]">
          <div className="flex min-h-full min-w-240 flex-col">
            <div className={cn(COLS, "sticky top-0 z-[1] border-y border-line bg-strip px-5 py-2.5 text-[12px] font-semibold text-ink-muted")}>
              <span>{t("Date")}</span>
              <span>{t("Investment")}</span>
              <span>{t("Type")}</span>
              <span>{t("Account")}</span>
              <span>{t("Note")}</span>
              <span className="text-right">{t("Amount")}</span>
              <span className="text-right">{t("Actions")}</span>
            </div>
            {rows.map(({ entry, investment }) => {
              const look = ENTRY_LOOK[entry.type];
              const sign = ENTRY_SIGN[entry.type];
              const kind = t(look.label);
              return (
                <div key={entry.id} className={cn(COLS, "min-h-14 border-b border-card-rule px-5 py-1.5 text-[14px] tabular-nums transition-colors hover:bg-strip")}>
                  <span className="text-[13px] whitespace-nowrap text-ink-2">{day(dayOf(entry.date))}</span>
                  <span className="flex min-w-0 flex-col gap-px">
                    <Link href={statementHref(investment.id)} data-i18n-skip="" className={cn(NAME_LINK, "font-semibold")}>
                      {investment.name}
                    </Link>
                  </span>
                  <span>
                    <Chip className={look.chip}>{kind}</Chip>
                  </span>
                  <span data-i18n-skip="" className={cn("truncate text-[13px]", entry.accountId ? "text-ink-2" : "text-ink-faint")}>
                    {entry.accountId ? walletName(entry.accountId) : t("No money moved")}
                  </span>
                  <span data-i18n-skip="" className="truncate text-[13px] text-ink-2">
                    {entry.note || "–"}
                  </span>
                  <span className={cn("text-right font-bold whitespace-nowrap", sign > 0 ? "text-tint-green-ink" : sign < 0 ? "text-ink" : "text-loss-ink")}>
                    {(sign > 0 ? "+ " : sign < 0 ? "– " : "") + money(Number(entry.amount))}
                  </span>
                  <span className="flex justify-end gap-1.5">
                    <button type="button" onClick={() => openEditEntry(investment.id, entry.id)} title={t("Edit")} aria-label={`${t("Edit")}: ${kind}`} className={ICON_BTN}>
                      <Glyph d={IC.edit} size={15} />
                    </button>
                    {entry.type !== "INVEST" && (
                      <button type="button" onClick={() => askDelete({ kind: "entry", investmentId: investment.id, entryId: entry.id })} title={t("Delete")} aria-label={`${t("Delete")}: ${kind}`} className={ICON_BTN}>
                        <Glyph d={IC.trash} size={15} />
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
            {!rows.length && <div className="px-6 py-12 text-center text-[13.5px] text-ink-muted">{t("No entries match. Try another type or clear the search.")}</div>}
          </div>
        </div>
        <div className="flex min-h-12 shrink-0 items-center justify-between gap-4 rounded-b-[18px] border-t border-line bg-strip px-5 py-2 text-[13px] text-ink-2 tabular-nums max-sm:flex-col max-sm:items-start">
          <span>{t("{count} entries", { count: formatCount(rows.length, fmt) })}</span>
          <span data-i18n-skip="" className="font-semibold">
            {t("Profit {amount}", { amount: money(profit) })} · {t("Invested {amount}", { amount: money(invested) })} · {t("Back {amount}", { amount: money(back) })}
          </span>
        </div>
      </section>
    </PageFrame>
  );
}
