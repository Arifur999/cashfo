// The Dashboard board's sums, kept apart from the cards so they are tested:
// the net worth and where it is, the four period cards' bars, the cash
// flow lines and the AI summary's facts. Amounts are in taka.

export interface WorthParts {
  // Money in the wallets, saved in goals, assets at today's value, the
  // capital still in investments, owed to you (pawna) and owed by you
  // (dena, a positive amount).
  cash: number;
  savings: number;
  assets: number;
  investments: number;
  pawna: number;
  dena: number;
}

export type WorthKey = keyof WorthParts;

export function worth(parts: WorthParts) {
  const own = parts.cash + parts.savings + parts.assets + parts.investments + parts.pawna;
  return { own, owe: parts.dena, net: own - parts.dena };
}

// Each part's share of what you own (dena against it too), rounded.
export function worthShare(parts: WorthParts, key: WorthKey): number {
  const { own } = worth(parts);
  return own > 0 ? Math.round((Math.abs(parts[key]) / own) * 100) : 0;
}

// The stacked bar: each part's width of own + owe, at least a sliver.
export function worthBar(parts: WorthParts): { key: WorthKey; width: number }[] {
  const keys: WorthKey[] = ["cash", "savings", "assets", "investments", "pawna", "dena"];
  const total = keys.reduce((sum, key) => sum + Math.max(0, parts[key]), 0);
  if (total <= 0) return [];
  return keys.filter((key) => parts[key] > 0).map((key) => ({ key, width: Math.max(1.2, Math.round((parts[key] / total) * 10_000) / 100) }));
}

export interface MoneyFlow {
  income: { amount: number; count: number };
  expenses: { amount: number; count: number };
  savings: { added: number; takenOut: number };
  loans: { took: number; gotBack: number; gave: number; paidBack: number };
  assets: { bought: number; sold: number };
  gifts: { gave: number; got: number };
  // Money put into investments from a wallet, and profit and capital back
  // into one (missing from a backend before Investments).
  investments?: { put: number; profit: number; back: number };
  worthChange: number;
}

export type FlowKey = "income" | "expenses" | "savings" | "loans" | "assets" | "investments" | "gifts";

// The Cash flow card: each line in (+) or out (−), and the net after all.
export function flowLines(flow: MoneyFlow): { lines: { key: FlowKey; value: number }[]; net: number } {
  const lines = (
    [
      { key: "income", value: flow.income.amount },
      { key: "expenses", value: -flow.expenses.amount },
      { key: "savings", value: flow.savings.takenOut - flow.savings.added },
      { key: "loans", value: flow.loans.took + flow.loans.gotBack - flow.loans.gave - flow.loans.paidBack },
      { key: "assets", value: flow.assets.sold - flow.assets.bought },
      { key: "investments", value: flow.investments ? flow.investments.profit + flow.investments.back - flow.investments.put : 0 },
      { key: "gifts", value: flow.gifts.got - flow.gifts.gave },
    ] as { key: FlowKey; value: number }[]
  ).map((line) => ({ ...line, value: Math.round(line.value * 100) / 100 }));
  return { lines, net: Math.round(lines.reduce((sum, line) => sum + line.value, 0) * 100) / 100 };
}

// A line's bar from the middle: its width (half the track at most) and
// where it starts, as percentages.
export function flowBar(value: number, largest: number): { left: number; width: number } {
  const width = largest > 0 ? (Math.abs(value) / largest) * 50 : 0;
  return { left: value >= 0 ? 50 : 50 - width, width };
}

// A share as a whole percent, null without a whole to share.
export const percentOf = (part: number, whole: number | null): number | null => (whole && whole > 0 ? Math.round((part / whole) * 100) : null);

// The AI summary's facts for the period: what share was kept, the biggest
// cost, and how far income and spending went against the target and
// budget (each null when there is none).
export function summaryFacts(input: { income: number; expense: number; biggest: { name: string; amount: number } | null; target: number | null; budget: number | null }) {
  return {
    empty: input.income === 0 && input.expense === 0,
    kept: input.income > 0 ? Math.round(((input.income - input.expense) / input.income) * 100) : 0,
    biggest: input.biggest,
    target: percentOf(input.income, input.target),
    budget: percentOf(input.expense, input.budget),
  };
}
