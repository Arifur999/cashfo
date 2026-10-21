import type { FeatureKey } from "./features";
import type { WorkspaceType } from "./api";

// The customer app's menu: Home, then the open workspace's pages -- Money,
// Books (business workspaces only) and Insights, which reviews them -- then
// the customer's own -- Habits and Vault -- with Invite & earn and Settings
// at the foot. The order came out of an information-architecture review of
// the AppSidebar board (2026-10-21): Insights moved up beside the money it
// reads, To-do moved up under Today (its badge sat below the fold), and
// Books leads with Customers & suppliers, a shop's daily page. Labels are
// the English strings t() translates. Icons are named here and drawn by the
// sidebar, so this file stays plain data the top bar's breadcrumb and the
// tab titles (pageTitle.ts) can use too.
export type NavTone = "money" | "loans" | "habits" | "vault" | "insights" | "neutral";

export type NavIcon =
  | "home"
  | "transactions"
  | "wallet"
  | "budget"
  | "income"
  | "loans"
  | "savings"
  | "assets"
  | "group"
  | "today"
  | "daily"
  | "namaz"
  | "ramadan"
  | "library"
  | "skills"
  | "todo"
  | "vault"
  | "insights"
  | "reports"
  | "challenges"
  | "ledger"
  | "people"
  | "clock"
  | "journal"
  | "gift"
  | "settings";

export interface NavLeaf {
  label: string;
  href: string;
  // Path prefixes that also count as this page (a detail route, an old
  // alias), on top of href itself.
  match?: string[];
  // Query values href needs: the habit pages share one route and differ
  // by ?category=.
  query?: Record<string, string>;
}

export interface NavItem extends NavLeaf {
  icon: NavIcon;
  subs?: NavLeaf[];
  // A pillar of its own inside its section (Loans is copper inside Money).
  tone?: NavTone;
  // Hidden while this feature flag is off (Admin > System > Feature flags).
  feature?: FeatureKey;
  // A page only for posting to the open workspace's books (Journal entry),
  // which only its owner or an accountant may do: a staff member isn't
  // shown it.
  workspaceWrite?: boolean;
  // "todayTasks": the count of open tasks today, shown as a badge.
  badge?: "todayTasks";
  // A small tag after the label ("Earn ৳" on Invite & earn).
  tag?: string;
}

export interface NavSection {
  label?: string;
  tone: NavTone;
  businessOnly?: boolean;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  { tone: "money", items: [{ label: "Home", href: "/dashboard", icon: "home" }] },
  {
    label: "Money",
    tone: "money",
    items: [
      { label: "Transactions", href: "/transactions", icon: "transactions" },
      {
        label: "Wallets",
        href: "/balance/overview",
        icon: "wallet",
        match: ["/balance"],
        subs: [
          { label: "Balance", href: "/balance/overview" },
          { label: "My wallets", href: "/balance/wallet" },
          { label: "Transfer", href: "/balance/transfer" },
          { label: "Statement", href: "/balance/ledger" },
        ],
      },
      { label: "Budget", href: "/categories", icon: "budget", match: ["/budget-planning"] },
      // Income planning became Income sources; its old address forwards here.
      { label: "Income sources", href: "/income-category", icon: "income", match: ["/income-planning"] },
      {
        label: "Loans",
        href: "/loan-management/dashboard",
        icon: "loans",
        tone: "loans",
        feature: "loan_management",
        match: ["/loan-management"],
        subs: [
          { label: "Overview", href: "/loan-management/dashboard" },
          { label: "Payments", href: "/loan-management/transactions" },
          { label: "Statement", href: "/loan-management/ledger" },
          { label: "People & banks", href: "/loan-management/bank-person-list" },
        ],
      },
      {
        label: "Savings",
        href: "/savings-goals/dashboard",
        icon: "savings",
        match: ["/savings-goals"],
        subs: [
          { label: "Goals", href: "/savings-goals/dashboard" },
          { label: "Summary", href: "/savings-goals/overview" },
          { label: "Savings wallets", href: "/savings-goals/wallet" },
          { label: "Move between goals", href: "/savings-goals/transfer" },
        ],
      },
      {
        label: "Assets",
        href: "/assets-management/dashboard",
        icon: "assets",
        match: ["/assets-management"],
        subs: [
          { label: "Overview", href: "/assets-management/dashboard" },
          { label: "My assets", href: "/assets-management/current" },
          { label: "Buy & sell", href: "/assets-management/purchase-sell" },
          { label: "Update value", href: "/assets-management/update" },
          { label: "Asset types", href: "/assets-management/category" },
        ],
      },
      { label: "Group expenses", href: "/group-expenses", icon: "group" },
    ],
  },
  {
    label: "Books",
    tone: "neutral",
    businessOnly: true,
    items: [
      { label: "Customers & suppliers", href: "/contacts", icon: "people" },
      { label: "Receivables & payables", href: "/dena-pawna", icon: "clock" },
      { label: "Accounts", href: "/accounts", icon: "ledger" },
      { label: "Journal entry", href: "/transactions/advanced", icon: "journal", workspaceWrite: true },
    ],
  },
  {
    label: "Insights",
    tone: "insights",
    items: [
      { label: "Overview", href: "/reports/overview", icon: "insights" },
      { label: "Reports", href: "/reports/detailed", icon: "reports" },
    ],
  },
  {
    label: "Habits",
    tone: "habits",
    items: [
      { label: "Today", href: "/habit-tracker", icon: "today" },
      { label: "To-do list", href: "/habit-tracker/todos", icon: "todo", badge: "todayTasks" },
      { label: "Daily habits", href: "/habit-tracker/daily", icon: "daily" },
      { label: "Namaz", href: "/habit-tracker/habits", query: { category: "Namaz" }, match: ["/habit-tracker/habits/namaz"], icon: "namaz" },
      { label: "Ramadan", href: "/habit-tracker/habits", query: { category: "Ramadan" }, match: ["/habit-tracker/habits/ramadan"], icon: "ramadan" },
      { label: "Challenges", href: "/habit-tracker/habits", query: { category: "Others" }, match: ["/habit-tracker/habits/others"], icon: "challenges" },
      { label: "My library", href: "/habit-tracker/habits", query: { category: "Book" }, icon: "library" },
      { label: "Skills", href: "/habit-tracker/habits", query: { category: "Course" }, icon: "skills" },
    ],
  },
  // "Vault", not "Security": Settings has a Security page of its own.
  { label: "Vault", tone: "vault", items: [{ label: "Password vault", href: "/password-manager", icon: "vault" }] },
];

// The sidebar's foot: the account's own pages. The top bar puts them under
// "Account", and Settings' sections under "Account › Settings" (the
// sidebar draws no subs for them; Settings has its own menu). "@@user":
// plain "Account" is Bangla's হিসাব, a ledger account, not the customer's.
export const NAV_FOOT_LABEL = "Account@@user";
export const NAV_FOOT: NavItem[] = [
  { label: "Invite & earn", href: "/referrals", icon: "gift", tag: "Earn ৳" },
  {
    label: "Settings",
    href: "/settings",
    icon: "settings",
    subs: [
      { label: "Profile", href: "/settings/profile" },
      { label: "Security", href: "/settings/security" },
      { label: "Workspaces", href: "/settings/workspaces" },
      { label: "App preferences", href: "/settings/app" },
      { label: "Help & support", href: "/settings/help" },
      { label: "Resources & legal", href: "/settings/resources" },
    ],
  },
];

export interface NavContext {
  workspaceType: WorkspaceType | undefined;
  isFeatureOn: (key: FeatureKey) => boolean;
  // The open workspace's owner or an accountant (the default); false for a
  // staff member, who can't post to its books.
  canManage?: boolean;
}

// The sections this customer sees: Books only in a business workspace,
// Loans only while its flag is on, Journal entry only to those who may
// post one.
export function visibleNavSections(ctx: NavContext): NavSection[] {
  const shown = (item: NavItem) => (!item.feature || ctx.isFeatureOn(item.feature)) && (ctx.canManage !== false || !item.workspaceWrite);
  return NAV_SECTIONS.filter((section) => !section.businessOnly || ctx.workspaceType === "BUSINESS")
    .map((section) => ({ ...section, items: section.items.filter(shown) }))
    .filter((section) => section.items.length > 0);
}

export interface NavLocation {
  section: NavSection | null;
  item: NavItem;
  sub: NavLeaf | null;
}

export type QueryReader = { get(name: string): string | null };

// A page's searchParams, as Next hands them to a Server Component.
export type PageQuery = Record<string, string | string[] | undefined>;

// searchParams read the way URLSearchParams.get() reads a query string: the
// first of a repeated value, null when it's absent.
export const queryOf = (params: PageQuery = {}): QueryReader => ({
  get: (name) => {
    const value = Object.hasOwn(params, name) ? params[name] : undefined;
    return (Array.isArray(value) ? value[0] : value) ?? null;
  },
});

const prefixScore = (prefix: string, pathname: string): number =>
  pathname === prefix || pathname.startsWith(`${prefix}/`) ? prefix.length : -1;

// How well a leaf matches the URL: the length of the longest prefix it
// claims, or -1. href needs its query values too; the extra prefixes don't
// (they are detail routes with no query).
const leafScore = (leaf: NavLeaf, pathname: string, query: QueryReader): number => {
  const queryOk = !leaf.query || Object.entries(leaf.query).every(([key, value]) => query.get(key) === value);
  const own = queryOk ? prefixScore(leaf.href, pathname) : -1;
  return Math.max(own, ...(leaf.match ?? []).map((prefix) => prefixScore(prefix, pathname)));
};

// Which menu entry the URL is on. The most specific prefix wins, so
// /transactions/advanced is Journal entry when the menu shows it and
// Transactions when it doesn't (outside a business workspace, or to a
// staff member).
export function findNavLocation(pathname: string, query: QueryReader, sections: NavSection[], foot: NavItem[] = NAV_FOOT): NavLocation | null {
  let best: { score: number; location: NavLocation } | null = null;
  const consider = (score: number, location: NavLocation) => {
    // A sub-page wins a tie with its own group, whose link it shares
    // (Wallets and Balance both open /balance/overview), so the top bar
    // names the page.
    const current = best as { score: number; location: NavLocation } | null;
    const beatsItsGroup = current !== null && score === current.score && location.sub !== null && current.location.sub === null && current.location.item === location.item;
    if (score >= 0 && (!current || score > current.score || beatsItsGroup)) best = { score, location };
  };
  const visit = (section: NavSection | null, item: NavItem) => {
    consider(leafScore(item, pathname, query), { section, item, sub: null });
    for (const sub of item.subs ?? []) {
      consider(leafScore(sub, pathname, query), { section, item, sub });
    }
  };
  for (const section of sections) for (const item of section.items) visit(section, item);
  for (const item of foot) visit(null, item);
  return best ? (best as { location: NavLocation }).location : null;
}

// Home, the Money pages and Books: where the phone boards float the + for a
// new transaction. Habits, Vault, Insights and the account pages don't;
// a page the menu doesn't know keeps it.
export function movesMoney(location: NavLocation | null): boolean {
  if (!location) return true;
  return location.section !== null && (location.section.tone === "money" || location.section.tone === "neutral");
}

export interface Breadcrumb {
  // The path above the heading ("Money", "Wallets"), untranslated.
  crumbs: string[];
  heading: string;
  tone: NavTone;
}

// What the top bar shows for a location: the section and group as crumbs,
// the page as the heading, the pillar's colour for the dot.
export function breadcrumbFor(location: NavLocation): Breadcrumb {
  const crumbs: string[] = [];
  const section = location.section?.label ?? (NAV_FOOT.includes(location.item) ? NAV_FOOT_LABEL : null);
  if (section) crumbs.push(section);
  if (location.sub) crumbs.push(location.item.label);
  return {
    crumbs,
    heading: location.sub?.label ?? location.item.label,
    tone: location.item.tone ?? location.section?.tone ?? "money",
  };
}

// Page labels the menu uses more than once ("Statement" in Wallets and
// Loans, "Overview" in Loans, Assets and Insights). On its own such a label
// could be any of them, so a title always names its group too.
const SHARED_LABELS: ReadonlySet<string> = (() => {
  const seen = new Set<string>();
  const shared = new Set<string>();
  for (const item of [...NAV_SECTIONS.flatMap((section) => section.items), ...NAV_FOOT]) {
    for (const leaf of [item, ...(item.subs ?? [])]) {
      if (seen.has(leaf.label)) shared.add(leaf.label);
      seen.add(leaf.label);
    }
  }
  return shared;
})();

// A tab title's parts, most specific first and untranslated: a sub-page
// with its group (["Transfer", "Wallets"]), a page on its own
// (["Transactions"]) unless its label is shared (["Overview", "Insights"]),
// and a record page's own name in front (["Rahim", "Transactions"]).
export function titleParts(location: NavLocation, record?: string | null): string[] {
  const { section, item, sub } = location;
  const group = section ? section.label : NAV_FOOT.includes(item) ? NAV_FOOT_LABEL : undefined;
  const page = sub ? [sub.label, item.label] : group && SHARED_LABELS.has(item.label) ? [item.label, group] : [item.label];
  const name = record?.trim();
  return name ? [name, ...page] : page;
}

export const TITLE_SEPARATOR = " · ";

// The tab title in the reader's language ("Transfer · Wallets"; the root
// layout adds "| Smartly"): the menu's words go through t(), a record's
// name is shown as given, since it is already the reader's own text.
export function titleFor(location: NavLocation, t: (key: string) => string, record?: string | null): string {
  const name = record?.trim();
  return titleParts(location, name)
    .map((part, index) => (name && index === 0 ? part : t(part)))
    .join(TITLE_SEPARATOR);
}
