// The sums behind the password vault: how strong a password is, the rules a
// vault password must meet, a generated password, the unlock countdown, the
// list's views, search, sort and counts, where the checkup stands and its
// tally, and what an Add or Edit login sends. Pure, so the page and its
// tests agree.
import { inEnglish, type Translate } from "@/lib/i18n/message";
import type { VaultCheckup, VaultEntryCategory, VaultEntrySummary } from "./api";
import type { ActionResult } from "./authActions";
import type { VaultEntryInput } from "./passwordVaultActions";

// The API's rule for a vault password (backend vault-password-rule.ts).
export const MIN_VAULT_PASSWORD = 8;
export const MAX_VAULT_PASSWORD = 128;
// What the strength meter calls too short for any password.
const MIN_STRENGTH_LENGTH = 6;

export type StrengthLabel = "Too short" | "Weak" | "Fair" | "Good" | "Strong";

export interface Strength {
  // 0 to 4 bars.
  score: number;
  label: StrengthLabel;
}

// A rough measure: length and the kinds of characters used.
export function passwordStrength(password: string): Strength {
  if (password.length === 0) return { score: 0, label: "Too short" };
  if (password.length < MIN_STRENGTH_LENGTH) return { score: 1, label: "Too short" };
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

// The line beside a saved login's strength meter, as a dictionary key and
// the count for it: "16 characters with numbers and symbols".
export function passwordDetail(password: string): { key: string; count: number } | null {
  const count = password.length;
  if (count === 0) return null;
  if (count === 1) return { key: "{count} character", count };
  const digits = /\d/.test(password);
  const symbols = /[^A-Za-z0-9]/.test(password);
  return { key: digits && symbols ? "{count} characters with numbers and symbols" : digits ? "{count} characters with numbers" : "{count} characters", count };
}

export interface Rule {
  key: "length" | "mix" | "noName" | "notAccount" | "match";
  // Dictionary key.
  label: string;
  ok: boolean;
}

// The parts of a name a vault password may not contain: each run of
// letters three or more long, as the API counts them ("Md" and "Al" would
// refuse too many ordinary passwords).
export function nameParts(name: string | null | undefined): string[] {
  return [...new Set((name ?? "").toLocaleLowerCase().match(/\p{L}{3,}/gu) ?? [])];
}

// The rules a new vault password must meet, the API's own (backend
// vault-password-rule.ts): 8 to 128 characters, letters and numbers, not
// the person's name, not the account password; and the two boxes match.
// With no account password typed (a reset from a Google-only account) the
// API is the one to check that rule.
export function vaultRules(password: string, confirm: string, accountPassword: string, name?: string | null): Rule[] {
  const lower = password.toLocaleLowerCase();
  return [
    { key: "length", label: "At least 8 characters", ok: password.length >= MIN_VAULT_PASSWORD && password.length <= MAX_VAULT_PASSWORD },
    { key: "mix", label: "Letters and numbers", ok: /\p{L}/u.test(password) && /\d/.test(password) },
    { key: "noName", label: "Doesn't contain your name", ok: password.length > 0 && !nameParts(name).some((part) => lower.includes(part)) },
    { key: "notAccount", label: "Not your account password", ok: password.length > 0 && password !== accountPassword },
    { key: "match", label: "Both match", ok: password.length > 0 && password === confirm },
  ];
}

// The API's reasons for refusing a new vault password, as the rule each
// one breaks (VAULT_PASSWORD_WEAK covers both the length and the mix).
export const VAULT_PASSWORD_REASONS: Record<string, Rule["key"]> = {
  VAULT_PASSWORD_WEAK: "length",
  VAULT_PASSWORD_HAS_NAME: "noName",
  VAULT_PASSWORD_IS_ACCOUNT_PASSWORD: "notAccount",
};

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

// The lock times offered (PATCH /api/vault/settings takes 1 to 30
// minutes; the server may cap them lower).
export const LOCK_MINUTE_CHOICES = [1, 2, 5, 10, 15, 30] as const;

// How long an unlock lasts, in milliseconds: the seconds the API sends,
// else its span string.
export const unlockSpanMs = (unlock: { expiresIn: string; expiresInSec?: number }): number => (unlock.expiresInSec && unlock.expiresInSec > 0 ? unlock.expiresInSec * 1000 : parseExpiry(unlock.expiresIn));

// Why the vault is locked, as the unlock form says it: locked by hand, the
// lock time ran out, the API ended the session, or the vault password was
// just changed or reset.
export type LockReason = "manual" | "timeout" | "session" | "changed";

// "8:24" from milliseconds left; never negative.
export function countdownText(msLeft: number): string {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// A vault session expiring mid-use, ended by a password change or reset, or
// locked: the API says so in its own words, and every one of them reads the
// same to the user -- back to the unlock form.
export const isLockedMessage = (message: string | undefined): boolean => !!message && /unlock|locked|expired|vault token/i.test(message);

// What a call answers when no answer came: the browser was offline, or the
// request dropped on the way. Already in the shared dictionary.
export const NO_CONNECTION_MESSAGE = "Check your internet and try again. Nothing was lost.";

// A server action that never reached the server rejects instead of
// answering. Read that as one more failed answer, so a spinner never hangs
// and the page never falls to the error screen (losing the unlock and
// whatever was being typed).
// The result keeps its own type (a vault call's carries the API's reason).
export async function settle<R extends ActionResult<unknown>>(call: Promise<R>): Promise<R> {
  try {
    return await call;
  } catch {
    return { success: false, message: NO_CONNECTION_MESSAGE } as R;
  }
}

// The login's first character as it is written ("b" for bKash, "e" for
// e-TIN portal), as the vault boards draw it.
export const avatarLetter = (title: string): string => title.trim().charAt(0) || "?";

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

export type VaultSort = "az" | "updated" | "newest" | "fix";
// "updated" follows updatedAt (any edit, a star too); "fix" puts the logins
// with the most problems first, then A to Z.
export const VAULT_SORTS: { value: VaultSort; label: string }[] = [
  { value: "az", label: "A to Z" },
  { value: "updated", label: "Recently updated" },
  { value: "newest", label: "Newest first" },
  { value: "fix", label: "Needs a fix first" },
];

const byTitle = (a: VaultEntrySummary, b: VaultEntrySummary) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" });

// "fix" needs the checkup's findings; without them it reads as A to Z.
export function sortEntries(entries: VaultEntrySummary[], sort: VaultSort, checkup: VaultCheckup | null = null): VaultEntrySummary[] {
  const list = [...entries];
  if (sort === "az") return list.sort(byTitle);
  if (sort === "newest") return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sort === "fix") return list.sort((a, b) => issuesOf(checkup, b.id).length - issuesOf(checkup, a.id).length || byTitle(a, b));
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// Matches the title, the login or the website, ignoring case.
export function filterEntries(entries: VaultEntrySummary[], query: string, category: VaultEntryCategory | ""): VaultEntrySummary[] {
  const q = query.trim().toLowerCase();
  return entries.filter((entry) => (category === "" || entry.category === category) && (q === "" || entry.title.toLowerCase().includes(q) || (entry.usernameOrEmail ?? "").toLowerCase().includes(q) || hostOf(entry.websiteUrl).toLowerCase().includes(q)));
}

// What the list shows: every login, the starred ones, the ones the checkup
// flags (all of them, or one problem from the health bar's chips), or one
// category.
export type SafetyView = "REUSED" | "WEAK" | "OLD";
export type VaultView = "" | "FAVORITES" | "ATTENTION" | SafetyView | VaultEntryCategory;

export const SAFETY_VIEWS: Record<SafetyView, VaultIssue> = { REUSED: "reused", WEAK: "weak", OLD: "old" };
export const isSafetyView = (view: VaultView): view is SafetyView => view in SAFETY_VIEWS;
const isCategoryView = (view: VaultView): view is VaultEntryCategory => view !== "" && view !== "FAVORITES" && view !== "ATTENTION" && !isSafetyView(view);

export function entriesInView(entries: VaultEntrySummary[], view: VaultView, flagged: Set<string>, checkup: VaultCheckup | null = null): VaultEntrySummary[] {
  if (view === "") return entries;
  if (view === "FAVORITES") return entries.filter((entry) => entry.isFavorite);
  if (view === "ATTENTION") return entries.filter((entry) => flagged.has(entry.id));
  if (isSafetyView(view)) {
    const ids = new Set(checkup ? checkup[SAFETY_VIEWS[view]] : []);
    return entries.filter((entry) => ids.has(entry.id));
  }
  return entries.filter((entry) => entry.category === view);
}

// The phone's filter chips: All, Favorites and Needs attention always, then
// only the categories that hold a login (or the one on show, so a filter
// that just emptied still says it is on).
export function chipViews(counts: Record<VaultEntryCategory, number>, view: VaultView, categories: VaultEntryCategory[]): VaultView[] {
  return ["", "FAVORITES", "ATTENTION", ...categories.filter((category) => counts[category] > 0 || view === category)];
}

// The same rule for the side menu and the chips: pressing the category (or
// the health bar's problem) on show again goes back to every login.
export const toggledView = (current: VaultView, picked: VaultView): VaultView => ((isCategoryView(picked) || isSafetyView(picked)) && picked === current ? "" : picked);

export type VaultIssue = "reused" | "weak" | "old";

// What the checkup found for one login, worst first.
export function issuesOf(checkup: VaultCheckup | null, id: string): VaultIssue[] {
  if (!checkup) return [];
  return (["reused", "weak", "old"] as const).filter((issue) => checkup[issue].includes(id));
}

// The logins with anything to fix.
export function attentionIds(checkup: VaultCheckup | null): Set<string> {
  return new Set(checkup ? [...checkup.reused, ...checkup.weak, ...checkup.old] : []);
}

// The checkup with only the logins still listed: one deleted since it ran
// is neither counted nor flagged.
export function checkupFor(entries: VaultEntrySummary[], checkup: VaultCheckup | null): VaultCheckup | null {
  if (!checkup) return null;
  const ids = new Set(entries.map((entry) => entry.id));
  const keep = (list: string[]) => list.filter((id) => ids.has(id));
  return { weak: keep(checkup.weak), reused: keep(checkup.reused), old: keep(checkup.old) };
}

// The security checkup's latest answer: the logins and the try it was asked
// for, and what it found (null when it failed).
export interface CheckupAnswer {
  entries: VaultEntrySummary[];
  attempt: number;
  found: VaultCheckup | null;
}

export type CheckupLoad = "loading" | "ready" | "failed";

// Where the checkup stands for these logins and this try (Try again counts
// up). While a new run is on its way the last findings stand in (they are a
// moment old). With none on hand it is loading, and a run that failed
// claims nothing, so a check that never answered can't read as all clear.
export function checkupStatus(answer: CheckupAnswer | null, entries: VaultEntrySummary[], attempt: number): { load: CheckupLoad; found: VaultCheckup | null } {
  if (answer?.found) return { load: "ready", found: answer.found };
  const answered = answer !== null && answer.entries === entries && answer.attempt === attempt;
  return { load: answered ? "failed" : "loading", found: null };
}

export interface CheckupBreakdown {
  fine: number;
  reused: number;
  weak: number;
  old: number;
}

// Every login counted once, by its worst issue (reused, then weak, then
// old), so the checkup's bar and legend add up to the logins there are.
export function checkupBreakdown(entries: VaultEntrySummary[], checkup: VaultCheckup | null): CheckupBreakdown {
  const counts: CheckupBreakdown = { fine: 0, reused: 0, weak: 0, old: 0 };
  for (const entry of entries) counts[issuesOf(checkup, entry.id)[0] ?? "fine"]++;
  return counts;
}

// A login's badge in the list: its worst problem, or Safe. Unknown (null)
// while the checkup hasn't answered.
export type Safety = VaultIssue | "safe";
export const safetyOf = (checkup: VaultCheckup | null, id: string): Safety | null => (checkup ? (issuesOf(checkup, id)[0] ?? "safe") : null);

export interface VaultHealth {
  total: number;
  safe: number;
  flagged: number;
  // Share of logins with nothing to fix, 0 to 100 (100 for an empty vault).
  percent: number;
  reused: number;
  weak: number;
  old: number;
}

// The health bar over the list: how many logins are safe, and how many
// have each problem (a login can have more than one).
export function vaultHealth(entries: VaultEntrySummary[], checkup: VaultCheckup): VaultHealth {
  const flagged = attentionIds(checkup).size;
  const total = entries.length;
  const safe = Math.max(0, total - flagged);
  return { total, safe, flagged, percent: total ? Math.round((safe / total) * 100) : 100, reused: checkup.reused.length, weak: checkup.weak.length, old: checkup.old.length };
}

// The password's age as the list says it: Today, 1 month ago, 14 months
// ago -- a dictionary key and its count.
export function passwordAge(changedAt: string, now: Date): { key: string; count: number } {
  const from = new Date(changedAt);
  const days = Math.floor((now.getTime() - from.getTime()) / 86_400_000);
  const months = (now.getFullYear() - from.getFullYear()) * 12 + now.getMonth() - from.getMonth() - (now.getDate() < from.getDate() ? 1 : 0);
  if (months <= 0) return days <= 0 ? { key: "Today", count: 0 } : { key: days === 1 ? "{count} day ago" : "{count} days ago", count: days };
  return { key: months === 1 ? "{count} month ago" : "{count} months ago", count: months };
}

// The services the Name box offers as you type (design: the Add login
// combobox): picking one fills in the name, website and category.
export const POPULAR_SERVICES: { title: string; category: VaultEntryCategory; website: string; translate?: boolean }[] = [
  { title: "Facebook", category: "SOCIAL", website: "facebook.com" },
  { title: "Gmail", category: "EMAIL", website: "mail.google.com" },
  { title: "bKash", category: "MOBILE_BANKING", website: "bkash.com" },
  { title: "Nagad", category: "MOBILE_BANKING", website: "nagad.com.bd" },
  { title: "YouTube", category: "SOCIAL", website: "youtube.com" },
  { title: "Daraz", category: "SHOPPING", website: "daraz.com.bd" },
  { title: "WhatsApp", category: "SOCIAL", website: "web.whatsapp.com" },
  { title: "Home Wi-Fi", category: "WIFI", website: "", translate: true },
];

// The suggestions for what is typed: all of them on an empty box, else the
// ones whose name holds it (but not one already typed in full), at most 8.
export function serviceSuggestions(typed: string, t: Translate = inEnglish) {
  const q = typed.trim().toLowerCase();
  return POPULAR_SERVICES.map((service) => ({ ...service, title: service.translate ? t(service.title) : service.title }))
    .filter((service) => !q || (service.title.toLowerCase().includes(q) && service.title.toLowerCase() !== q))
    .slice(0, 8);
}

export function categoryCounts(entries: VaultEntrySummary[]): Record<VaultEntryCategory, number> {
  const counts: Record<VaultEntryCategory, number> = { SOCIAL: 0, BANK: 0, MOBILE_BANKING: 0, EMAIL: 0, SHOPPING: 0, WORK: 0, WIFI: 0, GOVERNMENT: 0, OTHER: 0 };
  for (const entry of entries) counts[entry.category]++;
  return counts;
}

export interface QuickLogin {
  title: string;
  category: VaultEntryCategory;
  website: string;
  // The tile's letter, the kind of account under its name (a dictionary
  // key) and its tint, as the empty vault board draws each one.
  letter: string;
  kind: string;
  tint: string;
  // A plain name ("Home Wi-Fi") rather than a brand's: it goes through t().
  translate?: boolean;
}

const TINT = {
  blue: "bg-info-soft text-info",
  red: "bg-expense-soft text-expense",
  rose: "bg-rose-soft text-rose",
  mint: "bg-mint-50 text-emerald",
  amber: "bg-pillar-loans-soft text-pillar-loans",
  teal: "bg-pillar-insights-soft text-pillar-insights",
};

// The accounts people open most, offered on an empty vault.
export const QUICK_LOGINS: QuickLogin[] = [
  { title: "Facebook", category: "SOCIAL", website: "facebook.com", letter: "F", kind: "Social", tint: TINT.blue },
  { title: "Gmail", category: "EMAIL", website: "mail.google.com", letter: "G", kind: "Email", tint: TINT.red },
  { title: "bKash", category: "MOBILE_BANKING", website: "bkash.com", letter: "b", kind: "Mobile banking", tint: TINT.rose },
  { title: "Dutch-Bangla Bank", category: "BANK", website: "dutchbanglabank.com", letter: "D", kind: "Bank", tint: TINT.mint },
  { title: "Daraz", category: "SHOPPING", website: "daraz.com.bd", letter: "D", kind: "Shopping", tint: TINT.amber },
  { title: "Home Wi-Fi", category: "WIFI", website: "", letter: "W", kind: "Wi-Fi", tint: TINT.teal, translate: true },
  { title: "Office email", category: "WORK", website: "", letter: "O", kind: "Work", tint: TINT.blue, translate: true },
];

// A quick login's name in the reader's language; brand names stay as they are.
export const presetTitle = (preset: QuickLogin, t: Translate = inEnglish): string => (preset.translate ? t(preset.title) : preset.title);

// What the Add or Edit login drawer holds while it is open. The page keeps
// it, in memory only, so a lock (the 10 minutes running out, a save answered
// "locked") doesn't throw away what was typed.
export interface EntryDraft {
  // The login being edited; null adds a new one.
  editing: VaultEntrySummary | null;
  category: VaultEntryCategory;
  title: string;
  website: string;
  username: string;
  // Empty on an edit keeps the saved password.
  password: string;
  notes: string;
  holder: string;
  // Whether the account holder's name field is out.
  holderOpen: boolean;
  favorite: boolean;
  // Kept through a lock: the drawer says so when the vault opens again.
  kept: boolean;
}

// A fresh draft: the login as saved, a quick-add pick filled in, or blank.
export function draftFor(editing: VaultEntrySummary | null, preset: QuickLogin | null = null, t: Translate = inEnglish): EntryDraft {
  return {
    editing,
    category: editing?.category ?? preset?.category ?? "OTHER",
    title: editing?.title ?? (preset ? presetTitle(preset, t) : ""),
    website: editing?.websiteUrl ?? preset?.website ?? "",
    username: editing?.usernameOrEmail ?? "",
    password: "",
    notes: editing?.notes ?? "",
    holder: editing?.holderName ?? "",
    holderOpen: !!editing?.holderName,
    favorite: editing?.isFavorite ?? false,
    kept: false,
  };
}

// What a save sends. A new login leaves out what is empty. An edit sends
// null for a field that was emptied (or a holder's name removed): the API
// keeps any field left out, so leaving it out would bring the old value
// back. The password goes only when one was typed.
export function entryInput(draft: EntryDraft): VaultEntryInput {
  const empty = draft.editing ? null : undefined;
  const text = (value: string) => value.trim() || empty;
  return {
    title: draft.title.trim(),
    category: draft.category,
    websiteUrl: normalizeUrl(draft.website) || empty,
    usernameOrEmail: text(draft.username),
    holderName: draft.holderOpen ? text(draft.holder) : empty,
    notes: text(draft.notes),
    isFavorite: draft.favorite,
    ...(draft.password ? { password: draft.password } : {}),
  };
}

// What stops a save, as the field's error (dictionary keys). Any length of
// password is fine: a bKash PIN has 5 digits, an ATM PIN 4.
export function draftProblems(draft: EntryDraft): { title?: string; password?: string } {
  return {
    ...(draft.title.trim() === "" && { title: "Give this login a name" }),
    ...(draft.editing === null && draft.password === "" && { password: "Type or generate a password" }),
  };
}
