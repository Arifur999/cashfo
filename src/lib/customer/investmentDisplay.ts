// What the Investments pages show, worked out from an investment's entries
// and its payout plan (the InvestApp board's maths): capital, profit, the
// payout dates due and received, what comes next, its status and its
// return a year. Days are 'YYYY-MM-DD' in the app's time zone.
import type { Investment, InvestmentEntry, InvestmentEntryType, InvestmentFrequency, InvestmentKind } from "./investmentTypes";

export const dayOf = (value: string | null | undefined): string => (value ? value.slice(0, 10) : "");

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

// The same day n months later; a 31st falls back to a shorter month's last day.
export function addMonths(day: string, n: number): string {
  const [y0, m0, d] = day.split("-").map(Number);
  const total = m0 - 1 + n;
  const y = y0 + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return `${y}-${pad(m + 1)}-${pad(Math.min(d, last))}`;
}

const ms = (day: string) => Date.parse(`${day}T00:00:00.000Z`);
export const daysBetween = (from: string, to: string) => Math.round((ms(to) - ms(from)) / 86_400_000);

// [months between payouts, payouts a year]
export const FREQUENCY: Record<InvestmentFrequency, { step: number; perYear: number }> = {
  MONTHLY: { step: 1, perYear: 12 },
  QUARTERLY: { step: 3, perYear: 4 },
  HALF_YEARLY: { step: 6, perYear: 2 },
  YEARLY: { step: 12, perYear: 1 },
  IRREGULAR: { step: 0, perYear: 0 },
};
export const FREQUENCIES: InvestmentFrequency[] = ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "IRREGULAR"];
export const KINDS: InvestmentKind[] = ["BUSINESS", "SANCHAYAPATRA", "FDR", "SHARES", "PROPERTY", "OTHER"];

export type InvestmentStatus = "late" | "soon" | "ok" | "open" | "matured" | "closed";

export interface InvestmentFigures {
  investment: Investment;
  entries: InvestmentEntry[];
  put: number;
  back: number;
  loss: number;
  profit: number;
  capital: number;
  // Each payout expected (0 when not fixed) and in a year.
  per: number;
  yearly: number;
  step: number;
  perYear: number;
  // Payout days from the first one, up to six still to come.
  dues: string[];
  // How many were due by today, how many profits came, how many are late.
  due: number;
  got: number;
  late: number;
  next: string;
  status: InvestmentStatus;
  // Profit a year as a percent of what was put in.
  ret: number;
  last: InvestmentEntry | null;
  profits: InvestmentEntry[];
  closed: boolean;
}

const amountOf = (entry: InvestmentEntry) => Number(entry.amount) || 0;

// Oldest first; on one day the first money put in leads.
export const sortEntries = (entries: InvestmentEntry[]) =>
  [...entries].sort((a, b) => dayOf(a.date).localeCompare(dayOf(b.date)) || (a.type === "INVEST" ? -1 : b.type === "INVEST" ? 1 : a.createdAt.localeCompare(b.createdAt)));

export function figuresOf(investment: Investment, today: string): InvestmentFigures {
  const entries = sortEntries(investment.entries);
  let put = 0;
  let back = 0;
  let loss = 0;
  let profit = 0;
  const profits: InvestmentEntry[] = [];
  for (const entry of entries) {
    const amount = amountOf(entry);
    if (entry.type === "INVEST" || entry.type === "ADD") put += amount;
    else if (entry.type === "BACK") back += amount;
    else if (entry.type === "LOSS") loss += amount;
    else {
      profit += amount;
      profits.push(entry);
    }
  }
  const capital = Math.max(0, round2(put - back - loss));
  const { step, perYear } = FREQUENCY[investment.frequency] ?? FREQUENCY.IRREGULAR;
  const per = !step
    ? 0
    : investment.payoutMode === "FIXED"
      ? Number(investment.fixedAmount) || 0
      : investment.payoutMode === "RATE"
        ? Math.round((capital * (Number(investment.ratePercent) || 0)) / 100 / perYear)
        : 0;
  const closedOn = dayOf(investment.closedAt);
  const closed = !!closedOn;
  const maturity = dayOf(investment.maturityDate);
  const first = dayOf(investment.firstDueDate);
  const dues: string[] = [];
  if (step && first) {
    let ahead = 0;
    for (let k = 0; k < 600; k++) {
      const due = addMonths(first, k * step);
      if (maturity && due > maturity) break;
      if (closed && due > closedOn) break;
      dues.push(due);
      if (due > today && ++ahead >= 6) break;
    }
  }
  const due = dues.filter((d) => d <= today).length;
  const got = profits.length;
  const late = closed ? 0 : Math.max(0, due - got);
  const next = closed ? "" : got < dues.length ? dues[got] : "";
  const matured = !closed && !!maturity && maturity <= today;
  const status: InvestmentStatus = closed ? "closed" : matured ? "matured" : late > 0 ? "late" : !step ? "open" : next && daysBetween(today, next) <= 7 ? "soon" : "ok";
  const start = dayOf(investment.startDate);
  const days = Math.max(1, daysBetween(start, closed ? closedOn : today));
  const ret = put ? Math.round(((profit / put) * 365) / Math.max(days, 30) * 1000) / 10 : 0;
  return {
    investment,
    entries,
    put: round2(put),
    back: round2(back),
    loss: round2(loss),
    profit: round2(profit),
    capital,
    per,
    yearly: per * perYear,
    step,
    perYear,
    dues,
    due,
    got,
    late,
    next,
    status,
    ret,
    last: profits.at(-1) ?? null,
    profits,
    closed,
  };
}

const round2 = (value: number) => Math.round(value * 100) / 100;

// "18.3%", "16%".
export const percentText = (value: number) => `${(Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "")}%`;

// The capital an entry leaves behind, entry by entry (the statement's
// "Capital after" column), oldest first.
export function capitalAfter(entries: InvestmentEntry[]): number[] {
  let capital = 0;
  return sortEntries(entries).map((entry) => {
    if (entry.type === "INVEST" || entry.type === "ADD") capital += amountOf(entry);
    else if (entry.type === "BACK" || entry.type === "LOSS") capital -= amountOf(entry);
    return Math.max(0, round2(capital));
  });
}

// ---- Dashboard ----

const profitIn = (all: Investment[], prefix: string) =>
  all.reduce((sum, inv) => sum + inv.entries.reduce((s, e) => s + (e.type === "PROFIT" && dayOf(e.date).startsWith(prefix) ? amountOf(e) : 0), 0), 0);

export interface MonthStrip {
  expected: number;
  received: number;
  toCome: number;
  next: InvestmentFigures | null;
  late: InvestmentFigures[];
}

// This month: profit expected from fixed plans, received, still to come,
// the next payout and the late ones.
export function monthStrip(all: InvestmentFigures[], today: string): MonthStrip {
  const month = today.slice(0, 7);
  const open = all.filter((f) => !f.closed);
  let expected = 0;
  let toCome = 0;
  for (const f of open) {
    f.dues.forEach((due, index) => {
      if (due.slice(0, 7) !== month) return;
      expected += f.per;
      if (index >= f.got) toCome += f.per;
    });
  }
  const next = open.filter((f) => f.next && f.next >= today).sort((a, b) => a.next.localeCompare(b.next))[0] ?? null;
  return {
    expected,
    received: round2(profitIn(all.map((f) => f.investment), month)),
    toCome,
    next,
    late: open.filter((f) => f.status === "late"),
  };
}

export interface Totals {
  capital: number;
  activeCount: number;
  closedCount: number;
  profit: number;
  profitThisYear: number;
  yearly: number;
  // Profit a year, weighted by what was put in.
  averageReturn: number;
  back: number;
  latePayouts: number;
}

export function totalsOf(all: InvestmentFigures[], today: string): Totals {
  const open = all.filter((f) => !f.closed);
  const putOpen = open.reduce((s, f) => s + f.put, 0);
  return {
    capital: round2(open.reduce((s, f) => s + f.capital, 0)),
    activeCount: open.length,
    closedCount: all.length - open.length,
    profit: round2(all.reduce((s, f) => s + f.profit, 0)),
    profitThisYear: round2(profitIn(all.map((f) => f.investment), today.slice(0, 4))),
    yearly: open.reduce((s, f) => s + f.yearly, 0),
    averageReturn: putOpen ? open.reduce((s, f) => s + f.ret * f.put, 0) / putOpen : 0,
    back: round2(all.reduce((s, f) => s + f.back, 0)),
    latePayouts: open.reduce((s, f) => s + f.late, 0),
  };
}

export interface WatchRow {
  figures: InvestmentFigures;
  // 0 matured, 1 late, 2 coming within 45 days.
  rank: 0 | 1 | 2;
  day: string;
  daysLeft: number;
}

// Payouts to watch: matured ones to take back, late ones, then what is due
// in the next 45 days.
export function watchList(all: InvestmentFigures[], today: string): WatchRow[] {
  const rows: WatchRow[] = [];
  for (const f of all) {
    if (f.closed) continue;
    if (f.status === "matured") rows.push({ figures: f, rank: 0, day: dayOf(f.investment.maturityDate), daysLeft: 0 });
    else if (f.status === "late") rows.push({ figures: f, rank: 1, day: f.next, daysLeft: 0 });
    else if (f.next && daysBetween(today, f.next) <= 45) rows.push({ figures: f, rank: 2, day: f.next, daysLeft: daysBetween(today, f.next) });
  }
  return rows.sort((a, b) => a.rank - b.rank || a.day.localeCompare(b.day));
}

export interface MonthBar {
  month: string;
  profit: number;
  current: boolean;
}

// Profit received in each of the last 12 months, oldest first.
export function profitByMonth(all: Investment[], today: string): MonthBar[] {
  const month = today.slice(0, 7);
  const bars: MonthBar[] = [];
  for (let back = 11; back >= 0; back--) {
    const m = addMonths(`${month}-01`, -back).slice(0, 7);
    bars.push({ month: m, profit: round2(profitIn(all, m)), current: m === month });
  }
  return bars;
}

// ---- My investments ----

export type InvestmentTab = "active" | "closed" | "all";
export type InvestmentSort = "capital" | "profit" | "ret" | "next" | "newest";
export const INVESTMENT_SORTS: InvestmentSort[] = ["capital", "profit", "ret", "next", "newest"];

export function listInvestments(all: InvestmentFigures[], tab: InvestmentTab, search: string, sort: InvestmentSort, kindLabel: (kind: InvestmentKind) => string): InvestmentFigures[] {
  const needle = search.trim().toLowerCase();
  const rows = all
    .filter((f) => (tab === "active" ? !f.closed : tab === "closed" ? f.closed : true))
    .filter((f) => !needle || `${f.investment.name} ${kindLabel(f.investment.kind)}`.toLowerCase().includes(needle));
  // Ties keep the order the investments were added in.
  const added = (a: InvestmentFigures, b: InvestmentFigures) => a.investment.createdAt.localeCompare(b.investment.createdAt);
  return rows.sort((a, b) => {
    if (sort === "profit") return b.profit - a.profit || added(a, b);
    if (sort === "ret") return b.ret - a.ret || added(a, b);
    if (sort === "next") return (a.next || "9999").localeCompare(b.next || "9999") || added(a, b);
    if (sort === "newest") return dayOf(b.investment.startDate).localeCompare(dayOf(a.investment.startDate)) || added(b, a);
    return b.capital - a.capital || Number(a.closed) - Number(b.closed) || added(a, b);
  });
}

// ---- Transactions ----

export type EntryTab = "all" | "profit" | "invest" | "back" | "loss";
export const ENTRY_TABS: EntryTab[] = ["all", "profit", "invest", "back", "loss"];
const TAB_TYPES: Record<EntryTab, InvestmentEntryType[] | null> = { all: null, profit: ["PROFIT"], invest: ["INVEST", "ADD"], back: ["BACK"], loss: ["LOSS"] };

export const entryInTab = (entry: Pick<InvestmentEntry, "type">, tab: EntryTab) => !TAB_TYPES[tab] || TAB_TYPES[tab]!.includes(entry.type);

export interface EntryRow {
  entry: InvestmentEntry;
  investment: Investment;
}

// Every entry, newest first, of one investment or all of them.
export function entryRows(all: Investment[], investmentId: string): EntryRow[] {
  return all
    .filter((inv) => !investmentId || inv.id === investmentId)
    .flatMap((investment) => investment.entries.map((entry) => ({ entry, investment })))
    .sort((a, b) => dayOf(b.entry.date).localeCompare(dayOf(a.entry.date)) || b.entry.createdAt.localeCompare(a.entry.createdAt));
}

export function sumOf(rows: EntryRow[], types: InvestmentEntryType[]): number {
  return round2(rows.reduce((sum, row) => sum + (types.includes(row.entry.type) ? amountOf(row.entry) : 0), 0));
}

// How an entry moves money: + came to you, − went in, none for a loss.
export const ENTRY_SIGN: Record<InvestmentEntryType, -1 | 0 | 1> = { INVEST: -1, ADD: -1, PROFIT: 1, BACK: 1, LOSS: 0 };

// ---- Statement ----

export type ScheduleState = "got" | "up" | "late";

export interface ScheduleRow {
  day: string;
  state: ScheduleState;
  received: InvestmentEntry | null;
  amount: number;
  // Record is offered on the first payout not yet received, once it is
  // late or a week away.
  canRecord: boolean;
  soon: boolean;
}

// The payout schedule around today: up to six received before, and what is
// due up to two past the latest received or due.
export function schedule(f: InvestmentFigures, today: string): ScheduleRow[] {
  if (!f.step) return [];
  const firstShown = Math.max(0, Math.min(f.got, f.due) - 6);
  const rows: ScheduleRow[] = [];
  f.dues.forEach((day, index) => {
    if (index < firstShown) return;
    const received = f.profits[index] ?? null;
    const future = day > today;
    if (future && index > Math.max(f.got, f.due) + 2) return;
    const state: ScheduleState = received ? "got" : future ? "up" : "late";
    rows.push({
      day,
      state,
      received,
      amount: received ? amountOf(received) : f.per,
      canRecord: !received && !f.closed && (state === "late" || daysBetween(today, day) <= 7) && index === f.got,
      soon: daysBetween(today, day) <= 7,
    });
  });
  return rows;
}

// ---- Forms ----

// The kind guessed from the name, so nobody has to pick it; it can still
// be changed.
export function guessKind(name: string): InvestmentKind {
  const n = name.toLowerCase();
  if (/fdr|fixed deposit|ফিক্সড/.test(n)) return "FDR";
  if (/sanchay|সঞ্চয়পত্র|bond|বন্ড|sukuk|সুকুক|wage earner|ওয়েজ/.test(n)) return "SANCHAYAPATRA";
  if (/share|শেয়ার|fund|ফান্ড|stock|bo account|dse|cse/.test(n)) return "SHARES";
  if (/rent|ভাড়া|flat|ফ্ল্যাট|shop|দোকান|plot|প্লট|জমি|land|property|প্রপার্টি/.test(n)) return "PROPERTY";
  if (/business|ব্যবসা|partner|অংশীদার|garment|গার্মেন্ট|farm|ফার্ম|poultry|পোল্ট্রি|trading|ট্রেডিং|ltd|লিমিটেড|enterprise|এন্টারপ্রাইজ|store|স্টোর/.test(n)) return "BUSINESS";
  return "OTHER";
}

// Digits typed in either script, grouped the Bangladeshi way (3,00,000)
// while typing, at most two decimals.
export function groupTyped(raw: string): string {
  const english = raw.replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6)).replace(/[^\d.]/g, "");
  const [whole = "", ...rest] = english.split(".");
  const int = whole.replace(/^0+(?=\d)/, "");
  const last3 = int.slice(-3);
  let head = int.slice(0, -3);
  if (head) head = head.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  const grouped = (head ? `${head},` : "") + last3;
  return rest.length ? `${grouped}.${rest.join("").slice(0, 2)}` : grouped;
}

// A typed amount as a number; NaN when it isn't one.
export function parseTyped(raw: string): number {
  const english = raw.replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6)).replace(/[,\s৳]/g, "");
  if (!/^\d*\.?\d*$/.test(english) || !/\d/.test(english)) return NaN;
  return Number(english);
}

// What each payout would be for a plan: a fixed amount, or a yearly rate
// on the amount put in.
export function perPayout(frequency: InvestmentFrequency, unit: "tk" | "pct", each: number, amount: number): number {
  const { step, perYear } = FREQUENCY[frequency];
  if (!step || !(each > 0)) return 0;
  if (unit === "tk") return each;
  return amount > 0 ? Math.round((amount * each) / 100 / perYear) : 0;
}

// The capital a closing amount leaves as capital back, extra profit or loss.
export function closeSplit(capital: number, got: number) {
  return { back: Math.min(got, capital), profit: Math.max(0, round2(got - capital)), loss: Math.max(0, round2(capital - got)) };
}
