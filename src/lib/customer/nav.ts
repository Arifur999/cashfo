import type { FeatureKey } from "./features";
import type { WorkspaceType } from "./api";

// The customer app's two menus, as the design-v4 boards draw them (2026-10):
// Money Tracker (AppSidebar) -- Overview, Money, Plan & track, Account --
// and Habit Tracker (HabitSidebar) -- Overview, Worship, Habits, Plan. Pages
// under /habit-tracker are the Habit Tracker; every other page is the Money
// Tracker. Pages the boards leave out of the menu (Books, the insights
// overview) stay here as hidden sections: their routes keep working, and
// they keep their tab titles, breadcrumbs and search entries. Labels are
// the English strings t() translates. Icons are named here and drawn by the
// sidebar, so this file stays plain data the top bar's breadcrumb and the
// tab titles (pageTitle.ts) can use too.
export type NavTone = "money" | "loans" | "habits" | "vault" | "insights" | "neutral";

// Which of the two apps a section belongs to.
export type NavApp = "money" | "habit";

export type NavIcon =
  | "dashboard"
  | "home"
  | "transactions"
  | "balance"
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
  | "events"
  | "ai"
  | "zakat"
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
  // The page's own name where the menu shortens it ("Referrals" heads its
  // page as "Referral Program").
  heading?: string;
  // false: left out of the sidebar's list (the board has no row for it),
  // still named in the breadcrumb, the tab title and the search palette.
  menu?: false;
  // Such a page lights this row of its group instead (Checkout, Plans).
  litAs?: string;
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
  // A count after the label: "todayTasks" the open tasks today,
  // "habitsToday" today's habits done out of those planned ("3/5").
  badge?: "todayTasks" | "habitsToday";
  // A small tag after the label.
  tag?: string;
  // false: no floating + on this page, though its section has one.
  quickAdd?: false;
}

export interface NavSection {
  label?: string;
  tone: NavTone;
  // "money" when left out.
  app?: NavApp;
  // The app's first section ("Overview"): drawn in the menu, but the top
  // bar's breadcrumb doesn't name it (the boards show just "Dashboard").
  quiet?: boolean;
  // Not drawn in the menu: pages the boards leave out, which still need a
  // name (the tab title, the breadcrumb) and a search entry.
  hidden?: boolean;
  businessOnly?: boolean;
  // The phone's floating + for a new transaction shows on its pages.
  quickAdd?: boolean;
  items: NavItem[];
}

// The Habit Tracker's name, as the tab title and the search palette add it
// to a page whose own name the Money Tracker uses too (Dashboard).
export const HABIT_APP_LABEL = "Habit Tracker";
export const MONEY_APP_LABEL = "Money Tracker";

// Where each app opens: the top bar's switch goes there.
export const MONEY_HOME = "/dashboard";
export const HABIT_HOME = "/habit-tracker";

export const NAV_SECTIONS: NavSection[] = [
  // ---- Money Tracker (AppSidebar) ----
  {
    label: "Overview",
    tone: "money",
    quiet: true,
    quickAdd: true,
    items: [
      { label: "Dashboard", href: MONEY_HOME, icon: "dashboard" },
      { label: "Reports", href: "/reports/detailed", match: ["/reports/detailed", "/reports/categories"], icon: "reports", tone: "insights", quickAdd: false },
      { label: "AI Insights", href: "/ai-insights", icon: "ai", tone: "insights", quickAdd: false },
    ],
  },
  {
    label: "Money",
    tone: "money",
    quickAdd: true,
    items: [
      {
        label: "Balance",
        href: "/balance/accounts",
        icon: "balance",
        match: ["/balance"],
        // Balance v12: Accounts took in the old Overview and Wallet pages
        // (their paths redirect there).
        subs: [
          { label: "Accounts@@wallets", href: "/balance/accounts", match: ["/balance/overview", "/balance/wallet"] },
          { label: "Transfers", href: "/balance/transfer" },
          { label: "Ledger", heading: "Account ledger", href: "/balance/ledger" },
        ],
      },
      {
        label: "Income & Expense",
        href: "/income-expense",
        icon: "transactions",
        subs: [
          { label: "Overview", href: "/income-expense" },
          { label: "Transactions", href: "/transactions" },
          // The budget page lives at /categories; its old address forwards there.
          { label: "Budget Planning", href: "/categories", match: ["/budget-planning"] },
          // Both kinds of category; the old Income Category and Income
          // planning addresses forward here.
          { label: "Category Set", href: "/category-set", match: ["/income-category", "/income-planning"] },
        ],
      },
    ],
  },
  {
    label: "Plan & track",
    tone: "money",
    quickAdd: true,
    items: [
      {
        label: "Savings Goals",
        href: "/savings-goals/dashboard",
        icon: "savings",
        match: ["/savings-goals"],
        // Goals and Savings accounts (design v8). All moves opens from Move
        // money, under Goals; Savings overview became Savings accounts' top.
        subs: [
          { label: "Goals", href: "/savings-goals/dashboard", match: ["/savings-goals/transfer"] },
          { label: "Savings Accounts", href: "/savings-goals/wallet", match: ["/savings-goals/overview"] },
        ],
      },
      {
        label: "Assets Management",
        href: "/assets-management/dashboard",
        icon: "assets",
        match: ["/assets-management"],
        subs: [
          { label: "Dashboard", href: "/assets-management/dashboard" },
          { label: "Purchase & Sell", href: "/assets-management/purchase-sell" },
          { label: "Update", heading: "Asset update", href: "/assets-management/update" },
          { label: "Category", href: "/assets-management/category" },
          { label: "All Assets", href: "/assets-management/current" },
        ],
      },
      {
        label: "Loan Management",
        href: "/loan-management/dashboard",
        icon: "loans",
        tone: "loans",
        feature: "loan_management",
        match: ["/loan-management"],
        subs: [
          { label: "Dashboard", href: "/loan-management/dashboard" },
          { label: "Transactions", href: "/loan-management/transactions" },
          { label: "Ledger", href: "/loan-management/ledger" },
          { label: "Contacts", href: "/loan-management/bank-person-list" },
        ],
      },
      { label: "Group Expense", href: "/group-expenses", icon: "group" },
      {
        label: "Calendar & Events",
        href: "/events",
        icon: "events",
        subs: [
          { label: "Calendar", href: "/events" },
          { label: "People@@events", href: "/events/people" },
          { label: "My events", href: "/events/mine" },
        ],
      },
    ],
  },
  // "@@user": plain "Account" is Bangla's হিসাব, a ledger account, not the
  // customer's.
  {
    label: "Account@@user",
    tone: "neutral",
    items: [
      {
        label: "Referrals",
        heading: "Referral Program",
        href: "/referrals",
        icon: "gift",
        match: ["/referrals"],
        // Referral program v9: six pages, the withdraw form under Withdrawals.
        subs: [
          { label: "Dashboard", heading: "Referral dashboard", href: "/referrals" },
          { label: "Referred users", heading: "People you brought", href: "/referrals/users" },
          { label: "Earnings", href: "/referrals/earnings" },
          { label: "Withdrawals", href: "/referrals/withdrawals", match: ["/referrals/withdraw"] },
          { label: "Invite links", href: "/referrals/links" },
          { label: "Profile & payouts", heading: "Profile and payouts", href: "/referrals/profile" },
        ],
      },
      { label: "Password Management", href: "/password-manager", icon: "vault", tone: "vault" },
      // Zakat calculator: the year's zakat from the workspace's own records.
      { label: "Zakat", heading: "Zakat calculator", href: "/zakat", icon: "zakat" },
    ],
  },
  // Not in the boards' menu: a business workspace's books, and the insights
  // overview. Reached from their pages' own links and the search palette.
  {
    label: "Books",
    tone: "neutral",
    hidden: true,
    businessOnly: true,
    quickAdd: true,
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
    hidden: true,
    items: [{ label: "Overview", href: "/reports/overview", icon: "insights" }],
  },

  // ---- Habit Tracker (HabitSidebar) ----
  { label: "Overview", tone: "habits", app: "habit", quiet: true, items: [{ label: "Dashboard", href: HABIT_HOME, icon: "dashboard" }] },
  {
    label: "Worship",
    tone: "habits",
    app: "habit",
    items: [
      // Today's page first; Dashboard is the month (Namaz) or the year's
      // sheet (Ramadan), with its records under it.
      {
        label: "Namaz",
        href: "/habit-tracker/habits",
        query: { category: "Namaz" },
        icon: "namaz",
        subs: [
          { label: "Today", href: "/habit-tracker/habits", query: { category: "Namaz" } },
          { label: "Dashboard", href: "/habit-tracker/habits/namaz" },
        ],
      },
      {
        label: "Ramadan",
        href: "/habit-tracker/habits",
        query: { category: "Ramadan" },
        icon: "ramadan",
        subs: [
          { label: "Today", href: "/habit-tracker/habits", query: { category: "Ramadan" } },
          { label: "Dashboard", href: "/habit-tracker/habits/ramadan" },
        ],
      },
    ],
  },
  {
    label: "Habits",
    tone: "habits",
    app: "habit",
    items: [
      {
        label: "Daily habits",
        href: "/habit-tracker/daily",
        icon: "daily",
        badge: "habitsToday",
        subs: [
          { label: "Today", href: "/habit-tracker/daily" },
          { label: "Monthly report", href: "/habit-tracker/daily/report" },
        ],
      },
      // The "Others" trackers, named Challenges.
      { label: "Challenges", href: "/habit-tracker/habits", query: { category: "Others" }, match: ["/habit-tracker/habits/others"], icon: "challenges" },
      {
        label: "My Library",
        href: "/habit-tracker/habits",
        query: { category: "Book" },
        icon: "library",
        subs: [
          { label: "Reading now", href: "/habit-tracker/habits", query: { category: "Book" } },
          { label: "Dashboard", href: "/habit-tracker/habits/library", heading: "Library dashboard" },
        ],
      },
      { label: "Skills", href: "/habit-tracker/habits", query: { category: "Course" }, icon: "skills" },
    ],
  },
  // "@@habits": a to-do plan (পরিকল্পনা), not a subscription plan.
  { label: "Plan@@habits", tone: "habits", app: "habit", items: [{ label: "To Do List", href: "/habit-tracker/todos", icon: "todo", badge: "todayTasks" }] },
  {
    label: "Write",
    tone: "habits",
    app: "habit",
    items: [
      {
        label: "Notes & Journal",
        href: "/habit-tracker/notes",
        icon: "journal",
        subs: [
          { label: "Notes", href: "/habit-tracker/notes" },
          { label: "Journal", href: "/habit-tracker/journal" },
        ],
      },
    ],
  },
];

// Settings: the last group of the Money Tracker's menu (AppSidebar board),
// also the gear in the sidebar's foot and the account menu. Its sections
// show in the breadcrumb as "Settings › Security" and in the search palette
// under "Account › Settings". Workspaces has no row (the workspace switcher
// and the account menu lead there).
export const NAV_FOOT_LABEL = "Account@@user";
export const NAV_FOOT: NavItem[] = [
  {
    label: "Settings",
    href: "/settings",
    icon: "settings",
    subs: [
      { label: "Profile", href: "/settings/profile" },
      { label: "Security", href: "/settings/security" },
      { label: "Plans & billing", href: "/settings/plans" },
      { label: "Notifications", href: "/settings/notifications" },
      { label: "Checkout", href: "/settings/plans/checkout", menu: false, litAs: "/settings/plans" },
      { label: "Workspaces", href: "/settings/workspaces", menu: false },
      { label: "App preferences", href: "/settings/app" },
      { label: "Data & privacy", href: "/settings/data" },
      { label: "Help & support", href: "/settings/help" },
      { label: "Resources & legal", href: "/settings/resources" },
    ],
  },
];

export const SETTINGS_ROUTE = "/settings";

// Where every Upgrade / Manage plan button goes: the plans page in Settings
// (built with the customer plan API).
export const PLANS_ROUTE = "/settings/plans";
// Paying for a plan (Checkout board), and a payment's status after.
export const CHECKOUT_ROUTE = `${PLANS_ROUTE}/checkout`;

// Which app a page belongs to: everything under /habit-tracker is the
// Habit Tracker.
export const navAppFor = (pathname: string): NavApp => (pathname === HABIT_HOME || pathname.startsWith(`${HABIT_HOME}/`) ? "habit" : "money");

export const sectionApp = (section: NavSection): NavApp => section.app ?? "money";

export interface NavContext {
  workspaceType: WorkspaceType | undefined;
  isFeatureOn: (key: FeatureKey) => boolean;
  // The open workspace's owner or an accountant (the default); false for a
  // staff member, who can't post to its books.
  canManage?: boolean;
}

// The sections this customer has, both apps and the hidden ones: Books
// only in a business workspace, Loans only while its flag is on, Journal
// entry only to those who may post one.
export function visibleNavSections(ctx: NavContext): NavSection[] {
  const shown = (item: NavItem) => (!item.feature || ctx.isFeatureOn(item.feature)) && (ctx.canManage !== false || !item.workspaceWrite);
  return NAV_SECTIONS.filter((section) => !section.businessOnly || ctx.workspaceType === "BUSINESS")
    .map((section) => ({ ...section, items: section.items.filter(shown) }))
    .filter((section) => section.items.length > 0);
}

// What one app's sidebar draws: its own sections, without the hidden ones.
export const menuSections = (sections: NavSection[], app: NavApp): NavSection[] => sections.filter((section) => !section.hidden && sectionApp(section) === app);

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
// /transactions/advanced is Journal entry when the workspace has it and
// Transactions when it doesn't (outside a business workspace, or to a
// staff member).
export function findNavLocation(pathname: string, query: QueryReader, sections: NavSection[], foot: NavItem[] = NAV_FOOT): NavLocation | null {
  let best: { score: number; location: NavLocation } | null = null;
  const consider = (score: number, location: NavLocation) => {
    // A sub-page wins a tie with its own group, whose link it shares
    // (Balance and its Accounts both open /balance/accounts), so the top
    // bar names the page.
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

// Where the phone floats the + for a new transaction: the Money Tracker's
// money pages and Books. Reports, the insights, the account's pages, the
// Habit Tracker and Settings don't; a page the menu doesn't know keeps it.
export function movesMoney(location: NavLocation | null): boolean {
  if (!location) return true;
  return location.section?.quickAdd === true && location.item.quickAdd !== false;
}

export interface Breadcrumb {
  // The path above the heading ("Balance"), untranslated.
  crumbs: string[];
  heading: string;
  tone: NavTone;
}

// What the top bar shows for a location, as the boards draw it: a group's
// page under its group ("Balance › Wallet"), a Habit Tracker page of its
// own under its section ("Habits › Daily habits"), and the Money Tracker's
// pages of their own and the first section's pages alone ("Group Expense",
// "Dashboard"). The pages the menu leaves out keep their section (Books).
export function breadcrumbFor(location: NavLocation): Breadcrumb {
  const { section, item, sub } = location;
  const namesSection = !!section?.label && !section.quiet && (sectionApp(section) === "habit" || !!section.hidden);
  const crumbs = sub ? [item.label] : namesSection && section?.label ? [section.label] : [];
  return {
    crumbs,
    heading: sub?.heading ?? sub?.label ?? item.heading ?? item.label,
    tone: item.tone ?? section?.tone ?? "money",
  };
}

// Page labels the menus use more than once ("Dashboard" in both apps and
// three groups, "Overview" in Balance, Savings and Insights). A group's
// page always names its group in a title; a page of its own with a shared
// label names its section (or, in the first section, its app).
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

// What tells a shared label apart: its section, but for the first
// section, which the Money Tracker's own page needs none of and the Habit
// Tracker's names its app.
function sectionMark(section: NavSection | null, item: NavItem): string | undefined {
  if (!section) return NAV_FOOT.includes(item) ? NAV_FOOT_LABEL : undefined;
  if (section.quiet) return sectionApp(section) === "habit" ? HABIT_APP_LABEL : undefined;
  return section.label;
}

// A tab title's parts, most specific first and untranslated: a group's
// page with its group (["Wallet", "Balance"]), a page on its own
// (["Referrals"]) unless its label is shared (["Dashboard", "Habit
// Tracker"]), and a record page's own name in front (["Rahim",
// "Transactions", "Income & Expense"]).
export function titleParts(location: NavLocation, record?: string | null): string[] {
  const { section, item, sub } = location;
  const mark = sectionMark(section, item);
  const page = sub ? [sub.label, item.label] : mark && SHARED_LABELS.has(item.label) ? [item.label, mark] : [item.label];
  const name = record?.trim();
  return name ? [name, ...page] : page;
}

export const TITLE_SEPARATOR = " · ";

// The tab title in the reader's language ("Wallet · Balance"; the root
// layout adds "| Smartly"): the menu's words go through t(), a record's
// name is shown as given, since it is already the reader's own text.
export function titleFor(location: NavLocation, t: (key: string) => string, record?: string | null): string {
  const name = record?.trim();
  return titleParts(location, name)
    .map((part, index) => (name && index === 0 ? part : t(part)))
    .join(TITLE_SEPARATOR);
}
