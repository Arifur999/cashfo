import type { FeatureKey } from "./features";
import type { WorkspaceType } from "./api";

// The customer app's menu, as the design's AppSidebar draws it: Home, then
// Money, Books (business workspaces only), Habits, Security and Insights,
// with Invite & earn and Settings at the foot. Labels are the English
// strings t() translates. Icons are named here and drawn by the sidebar,
// so this file stays plain data the top bar's breadcrumb can use too.
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
      { label: "Budget", href: "/categories", icon: "budget", match: ["/budget-planning", "/income-planning"] },
      { label: "Income sources", href: "/income-category", icon: "income" },
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
          { label: "Move money", href: "/savings-goals/transfer" },
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
          { label: "Categories", href: "/assets-management/category" },
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
      { label: "Accounts", href: "/accounts", icon: "ledger" },
      { label: "Customers & suppliers", href: "/contacts", icon: "people" },
      { label: "Receivables & payables", href: "/dena-pawna", icon: "clock" },
      { label: "Journal entry", href: "/transactions/advanced", icon: "journal" },
    ],
  },
  {
    label: "Habits",
    tone: "habits",
    items: [
      { label: "Today", href: "/habit-tracker", icon: "today" },
      { label: "Daily habits", href: "/habit-tracker/daily", icon: "daily" },
      { label: "Namaz", href: "/habit-tracker/habits", query: { category: "Namaz" }, match: ["/habit-tracker/habits/namaz"], icon: "namaz" },
      { label: "Ramadan", href: "/habit-tracker/habits", query: { category: "Ramadan" }, match: ["/habit-tracker/habits/ramadan"], icon: "ramadan" },
      { label: "My library", href: "/habit-tracker/habits", query: { category: "Book" }, icon: "library" },
      { label: "Skills", href: "/habit-tracker/habits", query: { category: "Course" }, icon: "skills" },
      { label: "Challenges", href: "/habit-tracker/habits", query: { category: "Others" }, match: ["/habit-tracker/habits/others"], icon: "challenges" },
      { label: "To-do list", href: "/habit-tracker/todos", icon: "todo", badge: "todayTasks" },
    ],
  },
  { label: "Security", tone: "vault", items: [{ label: "Password vault", href: "/password-manager", icon: "vault" }] },
  {
    label: "Insights",
    tone: "insights",
    items: [
      { label: "Overview", href: "/reports/overview", icon: "insights" },
      { label: "Reports", href: "/reports/detailed", icon: "reports" },
    ],
  },
];

export const NAV_FOOT: NavItem[] = [
  { label: "Invite & earn", href: "/referrals", icon: "gift", tag: "Earn ৳" },
  { label: "Settings", href: "/settings", icon: "settings" },
];

export interface NavContext {
  workspaceType: WorkspaceType | undefined;
  isFeatureOn: (key: FeatureKey) => boolean;
}

// The sections this customer sees: Books only in a business workspace,
// Loans only while its flag is on.
export function visibleNavSections(ctx: NavContext): NavSection[] {
  return NAV_SECTIONS.filter((section) => !section.businessOnly || ctx.workspaceType === "BUSINESS")
    .map((section) => ({ ...section, items: section.items.filter((item) => !item.feature || ctx.isFeatureOn(item.feature)) }))
    .filter((section) => section.items.length > 0);
}

export interface NavLocation {
  section: NavSection | null;
  item: NavItem;
  sub: NavLeaf | null;
}

type QueryReader = { get(name: string): string | null };

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
// /transactions/advanced is Journal entry when Books is shown and
// Transactions when it isn't.
export function findNavLocation(pathname: string, query: QueryReader, sections: NavSection[], foot: NavItem[] = NAV_FOOT): NavLocation | null {
  let best: { score: number; location: NavLocation } | null = null;
  const consider = (score: number, location: NavLocation) => {
    if (score >= 0 && (!best || score > best.score)) best = { score, location };
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
  if (location.section?.label) crumbs.push(location.section.label);
  if (location.sub) crumbs.push(location.item.label);
  return {
    crumbs,
    heading: location.sub?.label ?? location.item.label,
    tone: location.item.tone ?? location.section?.tone ?? "money",
  };
}
