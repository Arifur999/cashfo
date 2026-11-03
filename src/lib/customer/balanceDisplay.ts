// The Balance pages' (Accounts, Transfers, Ledger) wording and small sums,
// kept pure so they are tested on their own. Strings are English dictionary
// keys; the pages translate them.
import type { CSSProperties } from "react";
import { formatDay } from "@/lib/date";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import type { Translate } from "@/lib/i18n/message";
import type { ChipTone } from "@/components/smartly/Chip";
import type { LedgerKind, LedgerRow, TransactionType, WalletOverviewRow } from "./api";
import { walletType, type WalletType } from "./walletVisuals";

// ---- Card colours ----

// The ten colours an account's card can wear, as the board offers them;
// the backend keeps the same list (account-colors.ts).
export const ACCOUNT_COLORS = ["#1c7567", "#0f766e", "#0e7490", "#2563eb", "#4f46e5", "#7c3aed", "#be185d", "#b91c1c", "#c2410c", "#33413e"] as const;

// A type's own colour, for an account that has none of its own yet.
export const TYPE_COLOR: Record<WalletType, string> = { cash: "#1c7567", bank: "#0f766e", mfs: "#be185d" };

export function accountColor(account: { color?: string | null; accountSubtype: string | null }): string {
  const own = account.color?.toLowerCase();
  return own && (ACCOUNT_COLORS as readonly string[]).includes(own) ? own : TYPE_COLOR[walletType(account)];
}

// The colour as the CSS variable the wallet-card and wallet-tile utilities
// read (globals.css).
export const walletColorStyle = (color: string): CSSProperties => ({ "--wallet": color }) as CSSProperties;

// ---- Hidden balances ----

// A figure while balances are hidden: the currency sign and six dots.
export const maskedMoney = (symbol: string): string => `${symbol} ••••••`;

// ---- Accounts ----

export type AccountSort = "bal-desc" | "bal-asc";
export const ACCOUNT_SORTS: AccountSort[] = ["bal-desc", "bal-asc"];
export const SORT_LABEL: Record<AccountSort, string> = { "bal-desc": "High to low", "bal-asc": "Low to high" };

export function sortAccounts<T extends { currentBalance: string }>(rows: T[], sort: AccountSort): T[] {
  const sign = sort === "bal-asc" ? 1 : -1;
  return [...rows].sort((a, b) => sign * (Number(a.currentBalance) - Number(b.currentBalance)));
}

// Words an account is found by besides its name: its type in both
// languages, and what people call each kind.
const TYPE_WORDS: Record<WalletType, string> = {
  cash: "cash নগদ",
  bank: "bank account ব্যাংক",
  mfs: "mobile wallet bkash nagad rocket upay মোবাইল",
};

export function matchesAccount(account: { name: string; accountSubtype: string | null; accountNumber?: string | null }, displayName: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [account.name, displayName, TYPE_WORDS[walletType(account)], account.accountNumber ?? ""].join(" ").toLowerCase().includes(needle);
}

// "Used today", "Used yesterday", "Used 2 Sep" (with its year when it isn't
// this one); "No activity yet" before the first entry.
export function lastUsedText(lastActivity: string | null | undefined, today: string, t: Translate, locale: FormatLocale): string {
  if (!lastActivity) return t("No activity yet");
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastActivity}T00:00:00Z`)) / 86_400_000);
  if (days <= 0) return t("Used today");
  if (days === 1) return t("Used yesterday");
  const pattern = lastActivity.slice(0, 4) === today.slice(0, 4) ? "d MMM" : "d MMM yyyy";
  return t("Used {date}", { date: formatDay(lastActivity, pattern, locale) });
}

// Where the money sits by kind of account: each type's share of what the
// active accounts hold (an overdrawn one counts as nothing), for the board's
// one bar in three colours.
export interface TypeShare {
  type: WalletType;
  amount: number;
  // 0-100, whole.
  percent: number;
}

export function moneyByType(accounts: Pick<WalletOverviewRow, "accountSubtype" | "currentBalance">[]): TypeShare[] {
  const types: WalletType[] = ["cash", "bank", "mfs"];
  const held = types.map((type) => ({
    type,
    present: accounts.some((account) => walletType(account) === type),
    amount: accounts.filter((account) => walletType(account) === type).reduce((sum, account) => sum + Math.max(0, Number(account.currentBalance)), 0),
  }));
  const total = held.reduce((sum, row) => sum + row.amount, 0);
  return held.filter((row) => row.present).map(({ type, amount }) => ({ type, amount, percent: total > 0 ? Math.round((amount / total) * 100) : 0 }));
}

// Only an account nothing was ever posted to can be deleted; a backend
// that doesn't count entries yet is taken to have some.
export const hasHistory = (account: { entryCount?: number }): boolean => (account.entryCount ?? 1) > 0;

// ---- Match real balance ----

// A typed amount: Bangla digits too, one point, no grouping.
export function parseTypedAmount(raw: string): number | null {
  const english = raw.replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6)).replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(english)) return null;
  return Number(english);
}

export type MatchState = { state: "idle" } | { state: "ok" } | { state: "diff"; difference: number };

// What Match real balance would do: nothing yet, nothing (they match), or
// add or take off the difference.
export function matchState(current: number, typed: string): MatchState {
  const real = parseTypedAmount(typed);
  if (real === null) return { state: "idle" };
  const difference = Math.round((real - current) * 100) / 100;
  return difference === 0 ? { state: "ok" } : { state: "diff", difference };
}

// ---- Ledger ----

interface KindMeta {
  label: string;
  tone: ChipTone;
  // What the To / From column calls the name, money in and money out.
  kickerIn: string;
  kickerOut: string;
}

export const LEDGER_KIND_META: Record<LedgerKind, KindMeta> = {
  INCOME: { label: "Income", tone: "income", kickerIn: "Income from", kickerOut: "Income from" },
  EXPENSE: { label: "Expense", tone: "expense", kickerIn: "Spent on", kickerOut: "Spent on" },
  TRANSFER: { label: "Transfer", tone: "info", kickerIn: "From account", kickerOut: "To account" },
  SAVINGS: { label: "Savings", tone: "warning", kickerIn: "To goal", kickerOut: "To goal" },
  SAVINGS_WITHDRAW: { label: "Savings withdraw", tone: "loans", kickerIn: "From goal", kickerOut: "From goal" },
  LOAN_OUT: { label: "Loan paid", tone: "habits", kickerIn: "Paid to", kickerOut: "Paid to" },
  LOAN_IN: { label: "Loan received", tone: "habits", kickerIn: "Received from", kickerOut: "Received from" },
  PAYMENT_IN: { label: "Payment received", tone: "rose", kickerIn: "Received from", kickerOut: "Received from" },
  PAYMENT_OUT: { label: "Payment made", tone: "rose", kickerIn: "Paid to", kickerOut: "Paid to" },
  ASSET_PURCHASE: { label: "Asset purchase", tone: "insights", kickerIn: "Bought", kickerOut: "Bought" },
  ASSET_SALE: { label: "Asset sale", tone: "insights", kickerIn: "Sold", kickerOut: "Sold" },
  ADJUSTMENT: { label: "Adjustment", tone: "neutral", kickerIn: "Matched to", kickerOut: "Matched to" },
  OTHER: { label: "Other@@ledger", tone: "neutral", kickerIn: "With", kickerOut: "With" },
};

const KIND_OF_TYPE: Partial<Record<TransactionType, LedgerKind>> = { INCOME: "INCOME", EXPENSE: "EXPENSE", TRANSFER: "TRANSFER" };

// A row's kind; a backend older than Balance v12 sends none, so its
// transaction type stands in.
export const kindOf = (row: Pick<LedgerRow, "kind" | "transactionType">): LedgerKind => row.kind ?? KIND_OF_TYPE[row.transactionType] ?? "OTHER";

// Received or sent; an older backend's row reads it from the entry.
export const directionOf = (row: Pick<LedgerRow, "direction" | "entryType">, debitPositive: boolean): "in" | "out" =>
  row.direction ?? ((row.entryType === "DEBIT") === debitPositive ? "in" : "out");

// The name in a row's To / From column; an adjustment's is the real balance.
export function partyOf(row: Pick<LedgerRow, "party" | "counterAccounts" | "category">, kind: LedgerKind): string | null {
  if (kind === "ADJUSTMENT") return "Real balance";
  return row.party ?? row.category ?? row.counterAccounts?.[0] ?? null;
}

// Where a row's record lives, for Entry details' button; null for an
// adjustment (it is removed right there) and a cancelled row.
export function entrySource(row: Pick<LedgerRow, "transactionId" | "contactId" | "chargeForId">, kind: LedgerKind): { href: string; label: string } | null {
  if (row.chargeForId) return { href: "/balance/transfer", label: "Open in Transfers" };
  switch (kind) {
    case "INCOME":
    case "EXPENSE":
      return { href: `/transactions/${row.transactionId}`, label: "Open in Income & Expense" };
    case "TRANSFER":
      return { href: "/balance/transfer", label: "Open in Transfers" };
    case "SAVINGS":
    case "SAVINGS_WITHDRAW":
      return { href: "/savings-goals/dashboard", label: "Open in Savings Goals" };
    case "LOAN_OUT":
    case "LOAN_IN":
      return row.contactId ? { href: `/loan-management/ledger?contactId=${encodeURIComponent(row.contactId)}`, label: "Open in Loan Management" } : null;
    case "PAYMENT_IN":
    case "PAYMENT_OUT":
      return row.contactId ? { href: `/contacts/${encodeURIComponent(row.contactId)}`, label: "Open the contact" } : null;
    case "ASSET_PURCHASE":
    case "ASSET_SALE":
      return { href: "/assets-management/purchase-sell", label: "Open in Purchase & Sell" };
    case "ADJUSTMENT":
      return null;
    default:
      return { href: `/transactions/${row.transactionId}`, label: "Open details" };
  }
}

// The words an adjustment saved without a note carries (the backend's).
export const DEFAULT_ADJUSTMENT_NOTE = "Balance check";

// ---- CSV ----

const csvCell = (value: string | number | null | undefined): string => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export interface LedgerCsvInput {
  account: string;
  period: string;
  opening: string;
  closing: string;
  rows: { date: string; kind: string; direction: string; party: string; note: string; reference: string; in: string; out: string; balance: string }[];
  heads: { account: string; period: string; opening: string; closing: string; columns: string[] };
}

// The ledger as a spreadsheet opens it: the account, period and opening
// balance, a row per entry, and the closing balance. A byte-order mark lets
// Excel read the Bangla.
export function ledgerCsv(input: LedgerCsvInput): string {
  const lines: (string | number)[][] = [
    [input.heads.account, input.account],
    [input.heads.period, input.period],
    [input.heads.opening, input.opening],
    [],
    input.heads.columns,
    ...input.rows.map((row) => [row.date, row.kind, row.direction, row.party, row.note, row.reference, row.in, row.out, row.balance]),
    [],
    [input.heads.closing, input.closing],
  ];
  return `﻿${lines.map((line) => line.map(csvCell).join(",")).join("\r\n")}`;
}

// "ledger-islami-bank-2026-11-02.csv"; a name without Latin letters reads "account".
export function ledgerFileName(accountName: string, today: string): string {
  const slug = accountName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "account";
  return `ledger-${slug}-${today}.csv`;
}

// ---- Transfers ----

// The charge categories every workspace has (the backend's too); a mobile
// wallet's charge starts as its fee, any other as a bank charge.
export const BUILT_IN_CHARGE_CATEGORIES = ["Bank charge", "Mobile banking fee", "Service charge"];
export const defaultChargeCategory = (fromSubtype: string | null | undefined): string => (fromSubtype === "mfs" ? "Mobile banking fee" : "Bank charge");

// A charge typed in taka or as a percent of the amount, to the paisa.
export function chargeOf(amount: number, typed: string, mode: "tk" | "pct"): number {
  const value = parseTypedAmount(typed) ?? 0;
  if (mode === "tk") return value;
  return Math.round(amount * value) / 100;
}

// ---- Month ranges (Transfers' Custom period) ----

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
export const isMonthKey = (value: unknown): value is string => typeof value === "string" && MONTH.test(value);

// The first and last day of a run of months ("2026-09" to "2026-11"); one
// month when there is no end, the two put in order.
export function monthRangeDays(start: string, end?: string | null): { dateFrom: string; dateTo: string } {
  const [first, last] = !end || end >= start ? [start, end || start] : [end, start];
  const [year, month] = last.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { dateFrom: `${first}-01`, dateTo: `${last}-${String(lastDay).padStart(2, "0")}` };
}

