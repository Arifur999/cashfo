// The lists behind Settings: the sections, the account password rules,
// the help questions and the shortcuts. Pure data, so the nav, the phone
// menu and the pages agree.
import type { Rule } from "./vaultDisplay";

export const APP_VERSION = "0.1.0";

export type SettingsSectionKey = "profile" | "security" | "workspaces" | "app" | "help" | "resources";

export interface SettingsSection {
  key: SettingsSectionKey;
  href: string;
  // Dictionary keys.
  label: string;
  group: "Account" | "App" | "Support";
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { key: "profile", href: "/settings", label: "Profile", group: "Account" },
  { key: "security", href: "/settings/security", label: "Security", group: "Account" },
  { key: "workspaces", href: "/settings/workspaces", label: "Workspaces", group: "Account" },
  { key: "app", href: "/settings/app", label: "App preferences", group: "App" },
  { key: "help", href: "/settings/help", label: "Help & support", group: "Support" },
  { key: "resources", href: "/settings/resources", label: "Resources & legal", group: "Support" },
];

export const SETTINGS_GROUPS: SettingsSection["group"][] = ["Account", "App", "Support"];

export function sectionFor(pathname: string): SettingsSectionKey {
  const match = SETTINGS_SECTIONS.filter((section) => pathname === section.href || pathname.startsWith(`${section.href}/`)).sort((a, b) => b.href.length - a.href.length)[0];
  return match?.key ?? "profile";
}

export const MIN_ACCOUNT_PASSWORD = 8;
export const MAX_ACCOUNT_PASSWORD = 128;

// The API's rules for an account password, plus the two the page can check.
export function accountPasswordRules(password: string, confirm: string, currentPassword: string): Rule[] {
  return [
    { key: "length", label: "At least 8 characters", ok: password.length >= MIN_ACCOUNT_PASSWORD && password.length <= MAX_ACCOUNT_PASSWORD },
    { key: "mix", label: "Letters and numbers", ok: /[A-Za-z]/.test(password) && /\d/.test(password) },
    { key: "notAccount", label: "Not your old password", ok: password.length > 0 && password !== currentPassword },
    { key: "match", label: "Both match", ok: password.length > 0 && password === confirm },
  ];
}

// "Khaled Mahmud" -> "KM".
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// A Bangladeshi number as "+880" + the rest: "01711-482915" -> "1711-482915".
export function localPhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+880")) return trimmed.slice(4).replace(/^0/, "");
  if (trimmed.startsWith("880")) return trimmed.slice(3).replace(/^0/, "");
  return trimmed.replace(/^0/, "");
}

export const fullPhone = (local: string): string => (local.trim() ? `+880${local.trim().replace(/^0/, "")}` : "");

export interface Faq {
  id: string;
  // Dictionary keys.
  question: string;
  answer: string;
}

export const FAQS: Faq[] = [
  { id: "void", question: "Why can't I edit or delete a transaction?", answer: "So your balances always add up, a saved transaction stays as it is. To fix a mistake, void it: its effect on your wallets is reversed, and it stays in your history, crossed out. Then add the right one." },
  { id: "transfer", question: "How do I move money between my wallets?", answer: "Open Add at the top and pick Transfer. Choose the wallet the money leaves and the one it goes to, and the amount. Both balances change at once and nothing counts as income or spending." },
  { id: "group", question: "How is my share worked out in Group expenses?", answer: "Every expense in a group is split equally between the members who were in the group that month. Your balance is what you put in minus your share of what was spent, and Settle up shows who pays whom." },
  { id: "vault", question: "I forgot my vault password. Are my saved logins gone?", answer: "Yes. The logins are locked with the vault password itself, so a reset can only start over: you set a new vault password with your account password and the old entries are deleted." },
  { id: "referral", question: "When can I withdraw referral earnings?", answer: "A reward counts 30 days after your friend joined, as long as their account is still active. Everything counted so far can be withdrawn in one go into any of your wallets or savings pots." },
  { id: "bangla", question: "Can I use the app in Bangla?", answer: "Yes. Tap বাংলা at the top of any page, or pick it under App preferences so every device opens in Bangla." },
];

export function searchFaqs(faqs: Faq[], query: string, t: (key: string) => string): Faq[] {
  const q = query.trim().toLowerCase();
  if (!q) return faqs;
  return faqs.filter((faq) => `${t(faq.question)} ${t(faq.answer)} ${faq.question} ${faq.answer}`.toLowerCase().includes(q));
}

export const SHORTCUTS: { what: string; key: string }[] = [
  { what: "New transaction", key: "N" },
  { what: "Close a drawer", key: "Esc" },
];

export interface Guide {
  // Dictionary keys, and the help question it opens.
  title: string;
  body: string;
  faqId: string;
  tone: "money" | "income" | "warning" | "loans";
}

export const GUIDES: Guide[] = [
  { title: "Getting started", body: "Add your wallets, record a transaction and read the dashboard.", faqId: "transfer", tone: "money" },
  { title: "Budgets that work", body: "Set a limit for each category and see what is left.", faqId: "void", tone: "income" },
  { title: "Group expenses for families and messes", body: "Shares, settling up and closing the month.", faqId: "group", tone: "warning" },
  { title: "Keeping your passwords safe", body: "The vault password, Generate and one-tap copy.", faqId: "vault", tone: "loans" },
];

export const LEGAL_LINKS: { title: string; href: string }[] = [
  { title: "Terms of service", href: "/terms" },
  { title: "Privacy policy", href: "/privacy" },
  { title: "Refund policy", href: "/refund-policy" },
];
