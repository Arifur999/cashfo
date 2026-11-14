"use client";

import { useRouter } from "next/navigation";
import PageFrame from "@/components/smartly/PageFrame";
import { capitalAfter, dayOf, ENTRY_SIGN, percentText, schedule, sortEntries } from "@/lib/customer/investmentDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BTN_PRIMARY, BTN_SECONDARY, CARD, Chip, ENTRY_LOOK, FREQUENCY_WORDS, Glyph, IC, ICON_BTN, KIND_LOOK, KindTile, STATUS_CHIP } from "./investmentLook";
import { useInvestments } from "./InvestmentsProvider";
import { Kpi } from "./listUi";
import { StatusChip, usePlanText } from "./statusText";

const LEDGER_COLS = "grid grid-cols-[96px_minmax(0,1fr)_120px_124px_64px] items-center gap-x-3";

// Investments › Statement (the InvestStatement board): one investment's
// details, its totals, every entry with the capital after it, and its
// payout schedule.
export function InvestStatementClient({ selectedId }: { selectedId: string | null }) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const { figures, byId, today, money, day, walletName, openNew, openEntry, openEdit, openEditEntry, openClose, askDelete, reopen, statementHref } = useInvestments();
  const plan = usePlanText();
  const sorted = [...figures].sort((a, b) => Number(a.closed) - Number(b.closed) || a.investment.name.localeCompare(b.investment.name));
  const sc = (selectedId ? byId.get(selectedId) : null) ?? figures.find((f) => !f.closed) ?? figures[0] ?? null;

  if (!sc) {
    return (
      <PageFrame className="gap-[18px] leading-[normal] md:pt-6 md:pb-8">
        <div className={cn(CARD, "flex flex-col items-center gap-2.5 px-6 py-12 text-center")}>
          <span className="text-[16px] font-bold">{t("No investments yet")}</span>
          <span className="max-w-115 text-[13.5px] text-ink-muted">{t("Add money you put into a business, a sanchayapatra, an FDR or anything that pays you profit. Then record each profit when it comes.")}</span>
          <button type="button" onClick={openNew} className={BTN_PRIMARY}>
            {t("New investment")}
          </button>
        </div>
      </PageFrame>
    );
  }

  const inv = sc.investment;
  const look = KIND_LOOK[inv.kind];
  const open = !sc.closed;
  const entries = sortEntries(inv.entries);
  const capitals = capitalAfter(entries);
  const rows = schedule(sc, today);
  const words = FREQUENCY_WORDS[inv.frequency];
  const facts = [
    { k: t("Started"), v: day(dayOf(inv.startDate)) },
    { k: t("Payout plan"), v: t(words.label) + (inv.payoutMode === "RATE" && sc.step ? ` · ${t("{rate} a year", { rate: percentText(Number(inv.ratePercent)) })}` : "") },
    { k: t("Expected each time"), v: sc.per ? money(sc.per) : t("Not fixed@@investment") },
    { k: t("Profit comes into"), v: walletName(inv.profitAccountId) || "–" },
    { k: t("Next payout"), v: sc.closed ? "–" : sc.next ? day(sc.next) : sc.step ? t("No more") : t("Not fixed@@investment") },
    { k: sc.closed ? t("Closed on") : t("Matures on"), v: sc.closed ? day(dayOf(inv.closedAt)) : inv.maturityDate ? day(dayOf(inv.maturityDate)) : t("No end date") },
  ];
  const kpis = [
    { label: t("Money put in"), value: money(sc.put), sub: t("First amount and top-ups"), tone: "text-ink" },
    { label: t("Capital now"), value: money(sc.capital), sub: sc.back || sc.loss ? t("{back} back · {loss} lost", { back: money(sc.back), loss: money(sc.loss) }) : t("Nothing taken out"), tone: "text-ink" },
    { label: t("Profit received@@column"), value: money(sc.profit), sub: t("{count} payouts@@investment", { count: formatCount(sc.got, fmt) }), tone: "text-tint-green-ink" },
    { label: t("Return a year"), value: percentText(sc.ret), sub: sc.put ? t("Profit is {rate} of what you put in", { rate: percentText((sc.profit / sc.put) * 100) }) : "", tone: "text-ink" },
  ];
  const scheduleSub = sc.step ? plan(sc) + (sc.late ? ` · ${t("{count} late", { count: formatCount(sc.late, fmt) })}` : "") : t("Not fixed@@investment");

  return (
    <PageFrame className="gap-[18px] leading-[normal] md:pt-6 md:pb-8">
      <div className="flex items-center gap-3 max-lg:flex-wrap">
        <label className="flex min-w-0 flex-1 items-center gap-2.5 max-sm:basis-full">
          <span className="text-[13px] font-semibold whitespace-nowrap text-ink-2">{t("Statement for")}</span>
          <select
            value={inv.id}
            onChange={(event) => router.replace(statementHref(event.target.value), { scroll: false })}
            aria-label={t("Statement for")}
            className="select-chevron h-10.5 w-full max-w-105 cursor-pointer rounded-[12px] border border-input bg-surface pl-3 text-[14px] font-semibold text-ink outline-none focus:border-emerald"
          >
            {sorted.map((f) => (
              <option key={f.investment.id} value={f.investment.id}>
                {f.investment.name + (f.closed ? ` ${t("(closed)")}` : "")}
              </option>
            ))}
          </select>
        </label>
        {open ? (
          <>
            <button type="button" onClick={() => openEntry("ADD", inv.id)} className={BTN_SECONDARY}>
              {t("Invest more")}
            </button>
            <button type="button" onClick={() => openEntry("BACK", inv.id)} className={BTN_SECONDARY}>
              {t("Take capital back")}
            </button>
            <button type="button" onClick={() => openEntry("PROFIT", inv.id)} className={BTN_PRIMARY}>
              <Glyph d={IC.coins} />
              {t("Record profit")}
            </button>
          </>
        ) : (
          <button type="button" onClick={() => reopen(inv.id)} className={BTN_SECONDARY}>
            {t("Reopen")}
          </button>
        )}
      </div>

      <section className={cn(CARD, "grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-6 px-5.5 py-5 max-md:grid-cols-1")}>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-3.5">
            <KindTile kind={inv.kind} size={48} />
            <span className="flex min-w-0 flex-col gap-0.75">
              <h1 data-i18n-skip="" className="m-0 truncate text-[20px] font-bold tracking-[-0.01em] text-ink">
                {inv.name}
              </h1>
              <span className="text-[13px] text-ink-muted">–</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip className={look.tile}>{t(look.label)}</Chip>
            <StatusChip figures={sc} />
          </div>
          {inv.note && (
            <p data-i18n-skip="" className="m-0 text-[13px] leading-[1.5] text-ink-2">
              {inv.note}
            </p>
          )}
          <div className="mt-auto flex flex-wrap gap-2">
            <button type="button" onClick={() => openEdit(inv.id)} className={cn(BTN_SECONDARY, "h-9 text-[13px]")}>
              <Glyph d={IC.edit} size={14} />
              {t("Edit")}
            </button>
            {open && (
              <button type="button" onClick={() => openClose(inv.id)} className={cn(BTN_SECONDARY, "h-9 text-[13px]")}>
                <Glyph d={IC.lock} size={14} />
                {t("Close investment")}
              </button>
            )}
            <button type="button" onClick={() => askDelete({ kind: "investment", id: inv.id })} className={cn(BTN_SECONDARY, "h-9 text-[13px] text-loss-ink")}>
              <Glyph d={IC.trash} size={14} />
              {t("Delete")}
            </button>
          </div>
        </div>
        <dl className="m-0 grid grid-cols-2 content-start gap-x-5 gap-y-3.5">
          {facts.map((x) => (
            <div key={x.k} className="flex min-w-0 flex-col gap-0.75">
              <dt className="text-[12px] text-ink-muted">{x.k}</dt>
              <dd data-i18n-skip="" className="m-0 text-[14px] font-semibold tabular-nums">
                {x.v}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
        {kpis.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start gap-4 max-lg:grid-cols-1">
        <section aria-labelledby="iv-led-h" className={cn(CARD, "flex min-w-0 flex-col")}>
          <div className="px-5 pt-4 pb-2.5">
            <h2 id="iv-led-h" className="m-0 text-[16px] font-bold text-ink">
              {t("All entries")}
            </h2>
            <p className="m-0 mt-0.75 text-[12.5px] text-ink-muted">{t("Every taka in and out of this investment, oldest first")}</p>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-130">
              <div className={cn(LEDGER_COLS, "border-y border-line bg-strip px-5 py-2.25 text-[12px] font-semibold text-ink-muted")}>
                <span>{t("Date")}</span>
                <span>{t("Entry")}</span>
                <span className="text-right">{t("Amount")}</span>
                <span className="text-right">{t("Capital after")}</span>
                <span />
              </div>
              {entries.map((e, index) => {
                const lk = ENTRY_LOOK[e.type];
                const sign = ENTRY_SIGN[e.type];
                return (
                  <div key={e.id} className={cn(LEDGER_COLS, "min-h-13 border-b border-card-rule px-5 py-1.5 text-[13.5px] tabular-nums")}>
                    <span className="text-[13px] whitespace-nowrap text-ink-2">{day(dayOf(e.date))}</span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span>
                        <Chip className={lk.chip}>{t(lk.label)}</Chip>
                      </span>
                      <span data-i18n-skip="" className="truncate text-[12px] text-ink-muted">
                        {[e.accountId ? walletName(e.accountId) : t("No money moved"), e.note].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className={cn("text-right font-bold whitespace-nowrap", sign > 0 ? "text-tint-green-ink" : sign < 0 ? "text-ink" : "text-loss-ink")}>
                      {(sign > 0 ? "+ " : sign < 0 ? "– " : "") + money(Number(e.amount))}
                    </span>
                    <span className="text-right whitespace-nowrap text-ink-2">{money(capitals[index])}</span>
                    <span className="flex justify-end">
                      <button type="button" onClick={() => openEditEntry(inv.id, e.id)} title={t("Edit")} aria-label={`${t("Edit")}: ${t(lk.label)} ${day(dayOf(e.date))}`} className={ICON_BTN}>
                        <Glyph d={IC.edit} size={15} />
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between gap-3 rounded-b-[18px] bg-strip px-5 py-3 text-[13px] font-semibold tabular-nums">
            <span>{t("{count} entries", { count: formatCount(entries.length, fmt) })}</span>
            <span data-i18n-skip="">
              {t("Capital {amount}", { amount: money(sc.capital) })} · {t("Profit {amount}", { amount: money(sc.profit) })}
            </span>
          </div>
        </section>

        <section aria-labelledby="iv-sch-h" className={cn(CARD, "flex min-w-0 flex-col")}>
          <div className="px-5 pt-4 pb-2.5">
            <h2 id="iv-sch-h" className="m-0 text-[16px] font-bold text-ink">
              {t("Payout schedule")}
            </h2>
            <p className="m-0 mt-0.75 text-[12.5px] text-ink-muted">{scheduleSub}</p>
          </div>
          <div className="flex flex-col px-3 pb-3">
            {rows.map((s) => {
              const tone = s.state === "got" ? STATUS_CHIP.ok : s.state === "late" ? STATUS_CHIP.late : STATUS_CHIP.open;
              const sub = s.received ? t("Received {date}", { date: day(dayOf(s.received.date)) }) : s.state === "up" ? (s.soon ? t("Coming soon@@payout") : t("Upcoming")) : t("Not received yet");
              return (
                <div key={s.day} className="flex items-center gap-3 border-b border-card-rule px-2 py-2.25 tabular-nums">
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", tone)}>
                    <Glyph d={s.state === "got" ? IC.check : s.state === "late" ? IC.alert : IC.clock} size={14} stroke={2.5} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="text-[13.5px] font-semibold">{day(s.day)}</span>
                    <span className="text-[12px] text-ink-muted">{sub}</span>
                  </span>
                  <span className={cn("text-[13.5px] font-semibold whitespace-nowrap", s.state === "got" ? "text-tint-green-ink" : s.state === "late" ? "text-loss-ink" : "text-ink-2")}>{s.amount ? money(s.amount) : "–"}</span>
                  {s.canRecord && (
                    <button type="button" onClick={() => openEntry("PROFIT", inv.id)} className={cn(BTN_SECONDARY, "h-7.5 px-2.5 text-[12.5px]")}>
                      {t("Record")}
                    </button>
                  )}
                </div>
              );
            })}
            {!rows.length && (
              <div className="px-3 py-5.5 text-center text-[13px] leading-[1.5] text-ink-muted">
                {sc.step ? t("No payout dates yet.") : t("Payouts are not fixed for this investment. Record each profit when it comes and it shows in All entries.")}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageFrame>
  );
}
