// Pure helpers behind Settings' security, app preferences and delete-account
// screens, so the pages and their tests agree.
import { toBanglaDigits } from "@/lib/i18n/banglaDates";
import { takaSign } from "@/lib/i18n/formatPrefs";
import type { Locale } from "@/lib/i18n/translate";
import type { DateStyle, DigitStyle, DisplayPreferences, NumberGrouping, WeekStart } from "./api";

// ---- Two-step sign-in (GET /api/auth/two-step) ----

export interface TrustedDevice {
  id: string;
  deviceLabel: string;
  ipAddress: string | null;
  place: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  // This browser.
  current: boolean;
}

export interface TwoStepStatus {
  enabled: boolean;
  enabledAt: string | null;
  setupPending: boolean;
  backupCodesLeft: number;
  trustedDevices: TrustedDevice[];
}

export const TWO_STEP_CODE_LENGTH = 6;

// What a code box keeps of a keystroke or a paste: digits only (Bangla ones
// as English), six at most. "123 456" and "১২৩৪৫৬" both become "123456".
export const cleanTotpCode = (raw: string): string =>
  raw
    .replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6))
    .replace(/\D/g, "")
    .slice(0, TWO_STEP_CODE_LENGTH);

// A backup code as typed: letters and digits, the hyphen put back
// ("ab12cd34" -> "ab12-cd34").
export function cleanBackupCode(raw: string): string {
  const plain = raw.replace(/[^A-Za-z0-9]/g, "").toLowerCase().slice(0, 8);
  return plain.length > 4 ? `${plain.slice(0, 4)}-${plain.slice(4)}` : plain;
}

// The secret as the API sends it ("JBSW Y3DP ..."), in groups of four for
// typing into an app by hand.
export const groupSecret = (secret: string): string =>
  secret
    .replace(/\s+/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();

// The text file "Download" saves: one code a line, and what they are for.
export function backupCodesFile(codes: string[], email: string, today: string): string {
  return [`Smartly backup codes for ${email}`, `Made ${today}. Each code works once.`, "", ...codes, ""].join("\n");
}

// The API's two-step refusals, in the app's words (dictionary keys).
export function twoStepProblem(reason: string | undefined, fallback: string): string {
  switch (reason) {
    case "CODE_WRONG":
      return "That code didn't work. Check the time on your phone and try the newest code.";
    case "BACKUP_CODE_WRONG":
      return "That backup code didn't work, or it was used already.";
    case "TWO_STEP_CODE_REQUIRED":
      return "Enter the 6-digit code from your authenticator app, or a backup code.";
    case "RECENT_SIGN_IN_REQUIRED":
      return "For your safety, sign out and sign in again, then try this within 10 minutes.";
    case "THROTTLED":
      return "Too many attempts. Please wait a few minutes and try again.";
    default:
      return fallback;
  }
}

// ---- Delete my account (GET /api/account/delete/preview) ----

export interface DeletionPreview {
  wallets: number;
  transactions: number;
  savingsGoals: number;
  assets: number;
  loanContacts: number;
  groups: number;
  vaultEntries: number;
  // Referral money still to withdraw ("224.00"), or null.
  referralAvailable: string | null;
  deletionDate: string;
  graceDays: number;
}

export const DELETE_WORD = "DELETE";

// The deletion owner decision: 30 days to change your mind.
export const DELETION_GRACE_DAYS = 30;

// The dialog's list of what goes: the five lines of the board, the
// referral one only while there is money to withdraw.
export function deletionItems(preview: DeletionPreview | null): { key: string; text: string; amount?: string }[] {
  const items: { key: string; text: string; amount?: string }[] = [
    { key: "money", text: "Your wallets, transactions, budgets and reports" },
    { key: "plans", text: "Savings goals, assets and loan records" },
    { key: "groups", text: "Groups you run in Group Expense, for every member in them" },
    { key: "vault", text: "Your Password Manager vault and all saved logins" },
  ];
  if (preview?.referralAvailable && Number(preview.referralAvailable) > 0) items.push({ key: "referral", text: "Referral earnings you have not withdrawn yet ({amount})", amount: preview.referralAvailable });
  return items;
}

// ---- Numbers and dates (PATCH /api/auth/preferences) ----

export const DEFAULT_PREFERENCES: DisplayPreferences = { digitStyle: null, numberGrouping: "LAKH", dateStyle: "D_MMM_YYYY", weekStart: "SATURDAY" };

// The digits in force: the saved choice, or the language's own.
export const digitsInForce = (style: DigitStyle | null | undefined, locale: Locale): DigitStyle => style ?? (locale === "bn" ? "BENGALI" : "LATIN");

const writeDigits = (text: string, style: DigitStyle) => (style === "BENGALI" ? toBanglaDigits(text) : text);

// 123456 -> "1,23,456" (lakh) or "123,456", in the chosen digits.
export function sampleNumber(value: number, grouping: NumberGrouping, digits: DigitStyle): string {
  const text = new Intl.NumberFormat(grouping === "LAKH" ? "en-IN" : "en-US", { maximumFractionDigits: 0 }).format(value);
  return writeDigits(text, digits);
}

// "TK 1,23,456" in English, "৳ ১,২৩,৪৫৬" in Bangla.
export const sampleAmount = (value: number, grouping: NumberGrouping, digits: DigitStyle, locale: Locale): string => `${takaSign(locale)} ${sampleNumber(value, grouping, digits)}`;

const pad = (n: number) => String(n).padStart(2, "0");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// A yyyy-MM-dd day in a date style: "2 Oct 2026", "02/10/2026",
// "2026-10-02". The month name is the dictionary's (English key).
export function sampleDate(day: string, style: DateStyle, digits: DigitStyle, month: (name: string) => string = (name) => name): string {
  const [y, m, d] = day.split("-").map(Number);
  const text = style === "DD_MM_YYYY" ? `${pad(d)}/${pad(m)}/${y}` : style === "YYYY_MM_DD" ? `${y}-${pad(m)}-${pad(d)}` : `${d} ${month(MONTHS[m - 1] ?? "")} ${y}`;
  return writeDigits(text, digits);
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK_START_INDEX: Record<WeekStart, number> = { SUNDAY: 0, MONDAY: 1, SATURDAY: 6 };

// The first and last day of a week that starts on `start` (dictionary keys):
// Saturday -> ["Saturday", "Friday"].
export const weekRun = (start: WeekStart): [string, string] => [WEEKDAYS[WEEK_START_INDEX[start]], WEEKDAYS[(WEEK_START_INDEX[start] + 6) % 7]];

// The short weekday of a yyyy-MM-dd day (dictionary key): "Fri".
export function shortWeekday(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()].slice(0, 3);
}

export const WEEK_STARTS: WeekStart[] = ["SATURDAY", "SUNDAY", "MONDAY"];
export const DATE_STYLES: DateStyle[] = ["D_MMM_YYYY", "DD_MM_YYYY", "YYYY_MM_DD"];
export const WEEK_START_LABEL: Record<WeekStart, string> = { SATURDAY: "Saturday", SUNDAY: "Sunday", MONDAY: "Monday" };
