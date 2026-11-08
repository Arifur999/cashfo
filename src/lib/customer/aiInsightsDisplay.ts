import type { Translate } from "@/lib/i18n/message";
import type { AiHappening, AiReport, AiSummary, AiTodo, AiWay, AiWayTip } from "./aiInsightsTypes";

// AI Insights' sentences, built from the report's facts in the reader's
// language (pure, so they are tested). The words come from `w`: money from
// paisa, a month's name, a day, a count, all in the reader's digits.

export interface AiWords {
  t: Translate;
  money: (paisa: number) => string;
  // "October" for '2026-10'.
  month: (key: string) => string;
  // "1 October" for '2026-10-01'.
  day: (day: string) => string;
  count: (value: number) => string;
}

// Where each kind of to-do opens, and its button.
export const todoLink = (todo: AiTodo): { label: string; href: string } => {
  switch (todo.kind) {
    case "budget":
      return { label: "Open budget", href: "/categories" };
    case "bill":
      return { label: "See transactions", href: `/transactions?categoryId=${encodeURIComponent(todo.name)}` };
    case "goal":
      return { label: "Open goals", href: "/savings-goals/dashboard" };
    case "owed":
      return { label: "Open contacts", href: `/loan-management/ledger?contactId=${encodeURIComponent(todo.contactId)}` };
  }
};

const lastDay = (key: string) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
};

export function heroText(summary: AiSummary, todoCount: number, w: AiWords) {
  const { t, money, count } = w;
  const month = w.month(summary.month);
  const previous = w.month(summary.previous);
  const kicker = t("Your {month}, 1 to {last}", { month, last: count(lastDay(summary.month)) });
  const title =
    summary.mood === "good"
      ? t("{month} was a good month", { month })
      : summary.mood === "okay"
        ? t("{month} was an okay month", { month })
        : summary.mood === "tight"
          ? t("{month} was a tight month", { month })
          : t("A quiet {month}", { month });
  const after = todoCount ? t("A few small things need your attention, listed below.") : t("Nothing needs your attention right now.");
  const sub =
    summary.mood === "quiet"
      ? t("Nothing was written down in {month}. Add your income and spending to see advice here.", { month })
      : summary.kept < 0
        ? `${t("You spent {amount} more than you earned.", { amount: money(-summary.kept) })} ${after}`
        : `${t("You kept {amount} of what you earned.", { amount: money(summary.kept) })} ${after}`;
  const change = summary.spentChange;
  const tiles = [
    { label: t("Kept"), value: money(summary.kept), sub: summary.keptPercent === null ? t("No income written down") : t("{percent}% of your income", { percent: count(summary.keptPercent) }) },
    {
      label: t("Spent"),
      value: money(summary.expenses),
      sub:
        change === null
          ? ""
          : change === 0
            ? t("Same as {month}", { month: previous })
            : change < 0
              ? t("{percent}% less than {month}", { percent: count(-change), month: previous })
              : t("{percent}% more than {month}", { percent: count(change), month: previous }),
    },
    { label: t("Biggest spend"), value: summary.biggest ? money(summary.biggest.amount) : "—", sub: summary.biggest ? t(summary.biggest.name) : "" },
  ];
  return { kicker, title, sub, tiles };
}

export function todoText(todo: AiTodo, { t, money, count }: AiWords): { title: string; text: string } {
  switch (todo.kind) {
    case "budget":
      return todo.over
        ? { title: t("{name} is over its budget", { name: t(todo.name) }), text: t("{spent} of {limit} spent, {over} over this month.", { spent: money(todo.spent), limit: money(todo.limit), over: money(todo.spent - todo.limit) }) }
        : { title: t("{name} budget is almost used up", { name: t(todo.name) }), text: t("{spent} of {limit} spent. Only {left} left this month.", { spent: money(todo.spent), limit: money(todo.limit), left: money(todo.left) }) };
    case "bill":
      return { title: t("{name} is higher than usual", { name: t(todo.name) }), text: t("{now} this month. You usually pay about {usual}.", { now: money(todo.now), usual: money(todo.usual) }) };
    case "goal":
      return {
        title: t("{name} goal is falling behind", { name: todo.name }),
        text: todo.nothingIn ? t("Nothing went in this month. Put in {amount} to stay on plan.", { amount: money(todo.perMonth) }) : t("Put in {amount} a month to stay on plan.", { amount: money(todo.perMonth) }),
      };
    case "owed":
      return {
        title: t("{name} owes you {amount}", { name: todo.name, amount: money(todo.amount) }),
        text: todo.months === null ? t("Nothing paid back yet. A friendly reminder might help.") : t("No payment for {count} months. A friendly reminder might help.", { count: count(todo.months) }),
      };
  }
}

export const HAPPENING_TAG: Record<AiHappening["tone"], string> = { good: "Good news", watch: "Watch this", info: "Good to know" };

export function happeningText(row: AiHappening, w: AiWords): string {
  const { t, money, count } = w;
  switch (row.kind) {
    case "kept":
      return row.before === null
        ? t("You saved {percent}% of your income.", { percent: count(row.percent) })
        : row.percent >= row.before
          ? t("You saved {percent}% of your income, up from {before}% in {month}.", { percent: count(row.percent), before: count(row.before), month: w.month(row.previous) })
          : t("You saved {percent}% of your income, down from {before}% in {month}.", { percent: count(row.percent), before: count(row.before), month: w.month(row.previous) });
    case "overspent":
      return t("You spent {amount} more than you earned.", { amount: money(row.amount) });
    case "rose":
      return t("{name} went up by {amount} compared with {month}.", { name: t(row.name), amount: money(row.by), month: w.month(row.previous) });
    case "inside":
      return t("{name} stayed well inside its budget, with {amount} still left.", { name: t(row.name), amount: money(row.left) });
    case "income":
      return t("Your biggest income, {amount} from {name}, came in on {date}.", { name: t(row.name), amount: money(row.amount), date: w.day(row.date) });
  }
}

export const WAY_TEXT: Record<AiWayTip, string> = {
  eatOut: "Eat out two fewer times a week",
  ride: "Walk or take a rickshaw for rides under 3 km",
  bulk: "Buy rice, oil and lentils once a month instead of every week",
  list: "Make a list before you shop, and wait a day before buying",
  power: "Switch off lights, fans and the AC when you leave a room",
  less: "Spend a tenth less on {name}",
};

export const wayText = (way: AiWay, { t }: AiWords) => t(WAY_TEXT[way.tip], { name: t(way.name) });

// ---- Ask AI: the suggested questions, answered from the report.

export type AskKind = "spend" | "cut" | "afford" | "owed";

export interface AiAnswer {
  lines: string[];
  bullets: string[];
  chart: { label: string; amount: number; value: string; highest: boolean }[];
  note: string | null;
  link: { label: string; href: string } | null;
}

export function questionOf(kind: AskKind, report: AiReport, { t, money }: AiWords): string {
  switch (kind) {
    case "spend":
      return report.answers.spend ? t("How much did I spend on {name} in the last 3 months?", { name: t(report.answers.spend.name) }) : t("How much did I spend in the last 3 months?");
    case "cut":
      return t("Where can I cut back next month?");
    case "afford":
      return report.answers.afford ? t("Can I afford to spend {amount} this month?", { amount: money(report.answers.afford.amount) }) : t("Can I afford something big this month?");
    case "owed":
      return t("Who owes me money?");
  }
}

const NOT_READ = "I can't read that part of your records. Turn it on in AI settings.";

export function answerOf(kind: AskKind, report: AiReport, w: AiWords): AiAnswer {
  const { t, money, count } = w;
  const empty: AiAnswer = { lines: [], bullets: [], chart: [], note: null, link: null };
  switch (kind) {
    case "spend": {
      const answer = report.answers.spend;
      if (!answer) return { ...empty, lines: [t(NOT_READ)] };
      return {
        ...empty,
        lines: [
          t("You spent {total} on {name} in the last 3 months, about {perMonth} a month. {month} was the highest.", {
            total: money(answer.total),
            name: t(answer.name),
            perMonth: money(answer.perMonth),
            month: w.month(answer.highest),
          }),
        ],
        chart: answer.months.map((row) => ({ label: w.month(row.month), amount: row.amount, value: money(row.amount), highest: row.month === answer.highest })),
        link: { label: "See these transactions", href: `/transactions?categoryId=${encodeURIComponent(answer.name)}` },
      };
    }
    case "cut": {
      if (report.ways.length === 0) return { ...empty, lines: [t("Nothing stands out. Your spending looks steady.")] };
      const total = report.ways.reduce((sum, way) => sum + way.perMonth, 0);
      return {
        ...empty,
        lines: [t(report.ways.length === 1 ? "One place to look, about {amount} a month:" : "{count} places to look, about {amount} a month in all:", { count: count(report.ways.length), amount: money(total) })],
        bullets: report.ways.map((way) => t("{name}: {tip}, saves about {amount}.", { name: t(way.name), tip: wayText(way, w).toLowerCase(), amount: money(way.perMonth) })),
      };
    }
    case "afford": {
      const answer = report.answers.afford;
      if (!answer) return { ...empty, lines: [t(NOT_READ)] };
      const wait = answer.waitUntil ? t("If you can wait until {month}, it fits without touching your savings.", { month: w.month(answer.waitUntil) }) : null;
      if (answer.verdict === "yes")
        return { ...empty, lines: [t("Yes."), t("After your usual spending you have about {kept} left each month, so {amount} fits without touching your savings.", { kept: money(answer.keptAverage), amount: money(answer.amount) })] };
      if (answer.verdict === "slow")
        return {
          ...empty,
          lines: [t("Yes, but it would slow your goals."), t("After your usual spending you have about {kept} left each month, and your goals need about {goals} of it.", { kept: money(answer.keptAverage), goals: money(answer.goals) }), ...(wait ? [wait] : [])],
          link: { label: "Open savings goals", href: "/savings-goals/dashboard" },
        };
      return {
        ...empty,
        lines: [
          t("Not this month."),
          answer.keptAverage > 0 ? t("You usually have about {kept} left each month.", { kept: money(answer.keptAverage) }) : t("Nothing was left over in the last 3 months."),
          ...(wait ? [wait] : []),
        ],
      };
    }
    case "owed": {
      const answer = report.answers.owed;
      if (!answer) return { ...empty, lines: [t(NOT_READ)] };
      if (answer.count === 0) return { ...empty, lines: [t("Nobody owes you money right now.")] };
      return {
        ...empty,
        lines: [t(answer.count === 1 ? "1 person owes you {total}." : "{count} people owe you {total} in total.", { count: count(answer.count), total: money(answer.total) })],
        bullets: answer.people.map((row) => `${row.name}: ${money(row.amount)}`),
        note: answer.quiet ? t("{name} has not paid anything for {count} months. A friendly reminder might help.", { name: answer.quiet.name, count: count(answer.quiet.months ?? 0) }) : null,
        link: { label: "Open contacts", href: "/loan-management/bank-person-list" },
      };
    }
  }
}
