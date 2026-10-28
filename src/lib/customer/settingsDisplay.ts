// The lists behind Settings: the sections, the account password rules,
// the help questions and the shortcuts. Pure data, so the nav, the phone
// menu and the pages agree.
import type { LoginHistoryEntry } from "./api";
import { toEnglishDigits } from "./money";
import { nameParts, type Rule } from "./vaultDisplay";

export const APP_VERSION = "0.1.0";

export type SettingsSectionKey = "profile" | "security" | "plans" | "workspaces" | "app" | "help" | "resources";

export interface SettingsSection {
  key: SettingsSectionKey;
  href: string;
  // Dictionary keys.
  label: string;
  // "@@user": plain "Account" is Bangla's হিসাব, a ledger account.
  group: "Account@@user" | "App" | "Support";
  // Left out of the rail (design-v4 SettingsNav has no Workspaces row: the
  // workspace switcher and the account menu lead there).
  hidden?: boolean;
}

// Profile has its own address, as the sidebar's Settings › Profile does;
// /settings itself is the menu on a phone and the profile on a wide screen.
export const SETTINGS_SECTIONS: SettingsSection[] = [
  { key: "profile", href: "/settings/profile", label: "Profile", group: "Account@@user" },
  { key: "security", href: "/settings/security", label: "Security", group: "Account@@user" },
  { key: "plans", href: "/settings/plans", label: "Plans", group: "Account@@user" },
  { key: "workspaces", href: "/settings/workspaces", label: "Workspaces", group: "Account@@user", hidden: true },
  { key: "app", href: "/settings/app", label: "App preferences", group: "App" },
  { key: "help", href: "/settings/help", label: "Help & support", group: "Support" },
  { key: "resources", href: "/settings/resources", label: "Resources & legal", group: "Support" },
];

export const SETTINGS_GROUPS: SettingsSection["group"][] = ["Account@@user", "App", "Support"];

// The section a path belongs to; /settings (and anything unknown) is the
// profile, which the index shows on a wide screen.
export function sectionFor(pathname: string): SettingsSectionKey {
  const match = SETTINGS_SECTIONS.filter((section) => pathname === section.href || pathname.startsWith(`${section.href}/`)).sort((a, b) => b.href.length - a.href.length)[0];
  return match?.key ?? "profile";
}

export const sectionOf = (key: SettingsSectionKey): SettingsSection => SETTINGS_SECTIONS.find((section) => section.key === key) ?? SETTINGS_SECTIONS[0];

// App preferences' Reminders card, which the phone menu's Reminders row
// opens (/settings/app#reminders).
export const REMINDERS_ANCHOR = "reminders";
// The phone menu's Devices row (Security's devices card) and Numbers and
// dates row (App preferences' card).
export const DEVICES_ANCHOR = "devices";
export const NUMBERS_ANCHOR = "numbers";

export const MIN_ACCOUNT_PASSWORD = 8;
export const MAX_ACCOUNT_PASSWORD = 128;

// The API's rules for an account password, plus the ones the page can check
// ("Doesn't contain your name" is the vault's rule: the name's words of
// three letters or more, ignoring case).
export function accountPasswordRules(password: string, confirm: string, currentPassword: string, name = ""): Rule[] {
  const lower = password.toLocaleLowerCase();
  return [
    { key: "length", label: "At least 8 characters", ok: password.length >= MIN_ACCOUNT_PASSWORD && password.length <= MAX_ACCOUNT_PASSWORD },
    { key: "mix", label: "Letters and numbers", ok: /[A-Za-z]/.test(password) && /\d/.test(password) },
    { key: "noName", label: "Doesn't contain your name", ok: password.length > 0 && !nameParts(name).some((part) => lower.includes(part)) },
    { key: "notAccount", label: "Not your old password", ok: password.length > 0 && password !== currentPassword },
    { key: "match", label: "Both match", ok: password.length > 0 && password === confirm },
  ];
}

// The workspaces Settings › Workspaces lists and counts: mess and family
// groups live in Group expenses, not there.
export const ownWorkspaces = <T extends { type: string }>(businesses: T[]): T[] => businesses.filter((business) => business.type !== "GROUP");

// A Bangladeshi number as "+880" + the rest: "01711-482915" and
// "+880 1711-482915" -> "1711-482915". The country code goes only when
// something follows it, so a field that holds just "880" keeps it.
export function localPhone(phone: string): string {
  return phone
    .trim()
    .replace(/^\+?880(?=[\s\d-])/, "")
    .replace(/^[\s-]+/, "")
    .replace(/^0/, "");
}

// What the phone field keeps of a keystroke or a paste: Bangla digits as
// English ones, only digits and hyphens, and no +880 or leading 0 the
// field's own +880 already stands for. "+8801711482915" and
// "০১৭১১৪৮২৯১৫" both become "1711482915".
export const cleanLocalPhone = (raw: string): string => localPhone(toEnglishDigits(raw).replace(/[^\d-]/g, "")).slice(0, 14);

export const fullPhone = (local: string): string => {
  const rest = cleanLocalPhone(local);
  return rest ? `+880${rest}` : "";
};

// A number reduced to the digits after the country code, so the ways one
// number is written ("01711-482915", "+880 1711 482915") compare equal.
const phoneKey = (phone: string): string =>
  toEnglishDigits(phone)
    .replace(/\D/g, "")
    .replace(/^880(?=\d)/, "")
    .replace(/^0/, "");

export const samePhone = (a: string, b: string): boolean => phoneKey(a) === phoneKey(b);

// What a try to sign in came to, in the history's words (dictionary keys).
// The backend records why one failed: a wrong password, a try blocked by
// the rate limit, or a suspended account.
export function signInResult(entry: Pick<LoginHistoryEntry, "success" | "failureReason">): string {
  if (entry.success) return "Signed in";
  switch (entry.failureReason) {
    case "invalid_password":
      return "Wrong password";
    case "rate_limited":
      return "Blocked after too many tries";
    case "account_suspended":
      return "Account was suspended";
    default:
      return "Couldn't sign in";
  }
}

// "Last sign-in": the newest try that got in (the list is newest first).
export const lastSignInOf = (history: Pick<LoginHistoryEntry, "success" | "createdAt">[]): string | null => history.find((entry) => entry.success)?.createdAt ?? null;

// Someone else may have tried the password: the history then offers to
// change it.
export const triedThePassword = (entry: Pick<LoginHistoryEntry, "success" | "failureReason">): boolean => !entry.success && (entry.failureReason === "invalid_password" || entry.failureReason === "rate_limited");

// A device's or a try's address; the API stores "unknown" when a request
// came without one.
export const knownIp = (ip: string | null | undefined): string | null => (ip && ip.trim() && ip !== "unknown" ? ip.trim() : null);

// The file name in a Content-Disposition header ("attachment;
// filename="smartly-data.zip""), the RFC 5987 form first.
export function fileNameFrom(disposition: string | null): string | null {
  if (!disposition) return null;
  const encoded = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(disposition);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // A broken encoding falls back to the plain name below.
    }
  }
  const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/.exec(disposition);
  const name = (plain?.[2] ?? plain?.[1] ?? "").trim();
  return name || null;
}

export interface Faq {
  id: string;
  // Dictionary keys.
  question: string;
  answer: string;
}

export const FAQS: Faq[] = [
  { id: "void", question: "How do I fix or cancel a transaction?", answer: "Open it from Transactions. Edit fixes the amount, category, wallet, date or note: the original stays in its history, crossed out and marked as corrected, so your balances always add up. Void cancels one that should never have been added." },
  { id: "transfer", question: "How do I move money between my wallets?", answer: "Open Add at the top (the + button on a phone) and pick Transfer. Choose the wallet the money leaves and the one it goes to, and the amount. Both balances change at once and nothing counts as income or spending." },
  { id: "start", question: "Where do I start?", answer: "Add your wallets first, under Wallets: cash, a bank account, bKash or Nagad, each with what it holds today. Then record each income and expense with Add as it happens. Home sums it up: what you have, and what came in and went out this month." },
  { id: "budget", question: "How do budgets work?", answer: "Open Budget and give each kind of spending a monthly limit. Each category then shows what is left, or how far over it went. When one passes 90% of its limit, the bell tells you; you can turn that off under App preferences, Reminders." },
  { id: "group", question: "How is my share worked out in Group expenses?", answer: "Each expense is shared the way it was added: equally, by shares, by meals or in exact amounts, among the members in the group that day. Your balance is what you put in minus your share of what was spent, and Settle up shows who pays whom." },
  { id: "vault", question: "I forgot my vault password. Are my saved logins gone?", answer: "Yes. The logins are locked with the vault password itself, so a reset can only start over: you set a new vault password with your account password and the old entries are deleted." },
  { id: "referral", question: "When can I withdraw referral earnings?", answer: "A reward counts 30 days after your friend joined. Everything counted so far can be withdrawn in one go into any of your wallets or savings wallets." },
  { id: "bangla", question: "Can I use the app in Bangla?", answer: "Yes. Tap বাংলা at the top of any page (in the menu on a phone), or pick it under App preferences so every device opens in Bangla." },
];

export function searchFaqs(faqs: Faq[], query: string, t: (key: string) => string): Faq[] {
  const q = query.trim().toLowerCase();
  if (!q) return faqs;
  return faqs.filter((faq) => `${t(faq.question)} ${t(faq.answer)} ${faq.question} ${faq.answer}`.toLowerCase().includes(q));
}

// The keys that work on every page: Ctrl K (⌘K on a Mac) the search
// palette, N a new transaction, and Esc closes whatever drawer is open.
export const SHORTCUTS: { what: string; key: string }[] = [
  { what: "Search anything", key: "Ctrl K" },
  { what: "New transaction", key: "N" },
  { what: "Close a drawer", key: "Esc" },
];

export interface Guide {
  // Dictionary keys, and the help question it opens.
  title: string;
  body: string;
  faqId: "start" | "budget" | "group" | "vault";
  tone: "money" | "warning" | "rose";
  // How long it takes to read ("4 min read").
  minutes: number;
}

// Each guide opens the Help answer it is about.
export const GUIDES: Guide[] = [
  { title: "Getting started", body: "Add your wallets, record a transaction and read the dashboard.", faqId: "start", tone: "money", minutes: 4 },
  { title: "Budgets that work", body: "Set a limit for each category and see what is left.", faqId: "budget", tone: "money", minutes: 3 },
  { title: "Group Expense for families and messes", body: "Shares, meals, settling up and closing the month.", faqId: "group", tone: "warning", minutes: 6 },
  { title: "Keeping your passwords safe", body: "The vault password, Generate and the security checkup.", faqId: "vault", tone: "rose", minutes: 3 },
];

export const LEGAL_LINKS: { title: string; page: "terms" | "privacy" | "refund-policy" }[] = [
  { title: "Terms of service", page: "terms" },
  { title: "Privacy policy", page: "privacy" },
  { title: "Refund policy", page: "refund-policy" },
];
