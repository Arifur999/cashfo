// The sums behind the password vault: how strong a password is, the rules a
// vault password must meet, a generated password, the unlock countdown and
// the list's search, sort and counts. Pure, so the page and its tests agree.
import type { VaultEntryCategory, VaultEntrySummary } from "./api";

export const MIN_VAULT_PASSWORD = 6;
export const MAX_VAULT_PASSWORD = 128;

export type StrengthLabel = "Too short" | "Weak" | "Fair" | "Good" | "Strong";

export interface Strength {
  // 0 to 4 bars.
  score: number;
  label: StrengthLabel;
}

// A rough measure: length and the kinds of characters used.
export function passwordStrength(password: string): Strength {
  if (password.length === 0) return { score: 0, label: "Too short" };
  if (password.length < MIN_VAULT_PASSWORD) return { score: 1, label: "Too short" };
  let kinds = 0;
  if (/[a-z]/.test(password)) kinds++;
  if (/[A-Z]/.test(password)) kinds++;
  if (/\d/.test(password)) kinds++;
  if (/[^A-Za-z0-9]/.test(password)) kinds++;
  let score = 1;
  if (password.length >= 8 && kinds >= 2) score = 2;
  if (password.length >= 12 && kinds >= 3) score = 3;
  if (password.length >= 14 && kinds >= 4) score = 4;
  if (password.length >= 20 && kinds >= 3) score = 4;
  const label: StrengthLabel = score >= 4 ? "Strong" : score === 3 ? "Good" : score === 2 ? "Fair" : "Weak";
  return { score, label };
}

export interface Rule {
  key: "length" | "mix" | "notAccount" | "match";
  // Dictionary key.
  label: string;
  ok: boolean;
}

// The rules a new vault password must meet (the API's own, plus the two the
// page can check on its own).
export function vaultRules(password: string, confirm: string, accountPassword: string): Rule[] {
  return [
    { key: "length", label: "At least 6 characters", ok: password.length >= MIN_VAULT_PASSWORD && password.length <= MAX_VAULT_PASSWORD },
    { key: "mix", label: "Letters and numbers", ok: /[A-Za-z]/.test(password) && /\d/.test(password) },
    { key: "notAccount", label: "Not your account password", ok: password.length > 0 && password !== accountPassword },
    { key: "match", label: "Both match", ok: password.length > 0 && password === confirm },
  ];
}

export const rulesMet = (rules: Rule[]): boolean => rules.every((rule) => rule.ok);

export interface GeneratorOptions {
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  // Leave out 0/O, 1/l/I and the like.
  noLookalikes: boolean;
}

export const DEFAULT_GENERATOR: GeneratorOptions = { upper: true, lower: true, digits: true, symbols: true, noLookalikes: true };
export const GENERATOR_LENGTHS = { min: 8, max: 32, initial: 16 } as const;

const SETS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*-_+=?",
};
const LOOKALIKES = /[0O1lI|]/g;

// A random password with at least one character from every set picked.
// `random` yields numbers in [0, 1); the page passes one backed by
// crypto.getRandomValues.
export function generatePassword(length: number, options: GeneratorOptions, random: () => number = Math.random): string {
  const pools = (["upper", "lower", "digits", "symbols"] as const).filter((key) => options[key]).map((key) => (options.noLookalikes ? SETS[key].replace(LOOKALIKES, "") : SETS[key]));
  if (pools.length === 0) pools.push(options.noLookalikes ? SETS.lower.replace(LOOKALIKES, "") : SETS.lower);
  const pick = (pool: string) => pool[Math.floor(random() * pool.length)];
  const all = pools.join("");
  const chars = pools.map(pick);
  while (chars.length < length) chars.push(pick(all));
  // Shuffle so the guaranteed characters don't sit at the front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.slice(0, length).join("");
}

// "10m", "600s", "1h" -> milliseconds; 10 minutes when it can't be read.
export function parseExpiry(expiresIn: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(expiresIn.trim());
  if (!match) return 10 * 60 * 1000;
  const n = Number(match[1]);
  const unit = match[2] ?? "ms";
  return n * (unit === "ms" ? 1 : unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000);
}

// "8:24" from milliseconds left; never negative.
export function countdownText(msLeft: number): string {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export const avatarLetter = (title: string): string => (title.trim().charAt(0) || "?").toUpperCase();

// "https://www.dutchbanglabank.com/login" -> "dutchbanglabank.com".
export function hostOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// What the user typed, with a scheme in front when they left it out.
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export type VaultSort = "az" | "newest" | "updated";
export const VAULT_SORTS: { value: VaultSort; label: string }[] = [
  { value: "az", label: "A to Z" },
  { value: "newest", label: "Newest first" },
  { value: "updated", label: "Recently changed" },
];

export function sortEntries(entries: VaultEntrySummary[], sort: VaultSort): VaultEntrySummary[] {
  const list = [...entries];
  if (sort === "az") return list.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  if (sort === "newest") return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// Matches the title, the login or the website, ignoring case.
export function filterEntries(entries: VaultEntrySummary[], query: string, category: VaultEntryCategory | ""): VaultEntrySummary[] {
  const q = query.trim().toLowerCase();
  return entries.filter((entry) => (category === "" || entry.category === category) && (q === "" || entry.title.toLowerCase().includes(q) || (entry.usernameOrEmail ?? "").toLowerCase().includes(q) || hostOf(entry.websiteUrl).toLowerCase().includes(q)));
}

export function categoryCounts(entries: VaultEntrySummary[]): Record<VaultEntryCategory, number> {
  const counts: Record<VaultEntryCategory, number> = { SOCIAL: 0, BANK: 0, EMAIL: 0, SHOPPING: 0, WORK: 0, OTHER: 0 };
  for (const entry of entries) counts[entry.category]++;
  return counts;
}

export interface QuickLogin {
  title: string;
  category: VaultEntryCategory;
  website: string;
}

// The accounts people open most, offered on an empty vault.
export const QUICK_LOGINS: QuickLogin[] = [
  { title: "Facebook", category: "SOCIAL", website: "facebook.com" },
  { title: "Gmail", category: "EMAIL", website: "mail.google.com" },
  { title: "bKash", category: "BANK", website: "bkash.com" },
  { title: "Islami Bank", category: "BANK", website: "islamibankbd.com" },
  { title: "Daraz", category: "SHOPPING", website: "daraz.com.bd" },
  { title: "Home Wi-Fi", category: "OTHER", website: "" },
  { title: "Office email", category: "WORK", website: "" },
];
