// AI Insights as the API sends it (GET /api/businesses/:id/insights): the
// person's settings, and while it is on, the report the rules worked out.
// Amounts are in paisa; months are 'YYYY-MM', days 'YYYY-MM-DD'.

export type AiSection = "TRANSACTIONS" | "SAVINGS" | "LOANS" | "GROUPS";

export interface AiSettings {
  on: boolean;
  reads: AiSection[];
  // The 7 AM summary in the bell.
  morning: boolean;
}

export type AiMood = "good" | "okay" | "tight" | "quiet";

export interface AiSummary {
  month: string;
  previous: string;
  income: number;
  expenses: number;
  kept: number;
  keptPercent: number | null;
  // More (+) or less (−) spent than the month before, in %.
  spentChange: number | null;
  biggest: { name: string; amount: number } | null;
  mood: AiMood;
}

export type AiTodo =
  | { kind: "budget"; key: string; name: string; spent: number; limit: number; left: number; over: boolean }
  | { kind: "bill"; key: string; name: string; now: number; usual: number }
  | { kind: "goal"; key: string; id: string; name: string; perMonth: number; nothingIn: boolean }
  | { kind: "owed"; key: string; contactId: string; name: string; amount: number; months: number | null };

export type AiHappening =
  | { tone: "good" | "watch"; kind: "kept"; percent: number; before: number | null; previous: string }
  | { tone: "watch"; kind: "overspent"; amount: number }
  | { tone: "watch"; kind: "rose"; name: string; by: number; previous: string }
  | { tone: "good"; kind: "inside"; name: string; left: number }
  | { tone: "info"; kind: "income"; name: string; amount: number; date: string };

export type AiWayTip = "eatOut" | "ride" | "bulk" | "list" | "power" | "less";

export interface AiWay {
  key: string;
  tip: AiWayTip;
  name: string;
  perMonth: number;
}

export interface AiSpendAnswer {
  name: string;
  total: number;
  perMonth: number;
  months: { month: string; amount: number }[];
  highest: string;
}

export interface AiAffordAnswer {
  amount: number;
  keptAverage: number;
  goals: number;
  verdict: "yes" | "slow" | "wait";
  waitUntil: string | null;
}

export interface AiOwedAnswer {
  count: number;
  total: number;
  people: { contactId: string; name: string; amount: number }[];
  quiet: { name: string; months: number | null } | null;
}

export interface AiReport {
  generatedAt: string;
  summary: AiSummary;
  todos: AiTodo[];
  happened: AiHappening[];
  ways: AiWay[];
  // null where AI may not read that part.
  answers: { spend: AiSpendAnswer | null; afford: AiAffordAnswer | null; owed: AiOwedAnswer | null };
}

export interface AiInsightsPage extends AiSettings {
  // The chat, once a model is set up; until then only the suggested
  // questions are answered.
  chat: boolean;
  report: AiReport | null;
}
