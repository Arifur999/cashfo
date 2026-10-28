"use client";

import { FileText, Languages, LogOut, type LucideProps, Moon, Receipt, Repeat2, Search, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { useTheme } from "@/components/modules/Customer/Providers/ThemeProvider";
import CommandPalette, { CommandMark, useCommandShortcut, type CommandGroup, type CommandItem } from "@/components/smartly/CommandPalette";
import IconTile from "@/components/smartly/IconTile";
import Kbd from "@/components/smartly/Kbd";
import type { Tone } from "@/components/smartly/tones";
import { saveLanguageAction } from "@/lib/customer/authActions";
import { CONTACT_TYPE_LABELS, contactInitials } from "@/lib/customer/contactDisplay";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { NAV_FOOT, NAV_FOOT_LABEL, type NavIcon } from "@/lib/customer/nav";
import { searchPaletteAction, type PaletteContact, type PaletteResults, type PaletteTransaction } from "@/lib/customer/paletteActions";
import { palettePages, rankMatches, type PalettePage } from "@/lib/customer/paletteMatch";
import { SETTINGS_SECTIONS } from "@/lib/customer/settingsDisplay";
import { TRANSACTION_TYPE_LABELS } from "@/lib/customer/transactionDisplay";
import { formatDay, toDateInputValue } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { withoutContext } from "@/lib/i18n/message";
import { ADD_ACTION_ICONS, useAddActions, WithAddActions } from "./AddActionsProvider";
import { NAV_ICONS, useNavSections } from "./SidebarNav";
import { workspaceKind } from "./workspaceKind";

type Icon = React.ComponentType<LucideProps>;

// The menu's icons, as the sidebar draws them; a page with an icon this
// list doesn't know yet gets a plain page.
const PAGE_ICONS: Partial<Record<NavIcon, Icon>> = NAV_ICONS;

const DEBOUNCE_MS = 250;
// People and transactions are looked up from this many letters; pages and
// actions answer from the first.
const MIN_SEARCH = 2;
const PAGE_LIMIT = 8;
const RECENT_LIMIT = 5;
// The pages last opened from here, newest first (their keys), for this
// browser only.
const RECENTS_KEY = "palette-recent-pages";
const NOTHING: PaletteResults = { contacts: [], transactions: [] };
const KBD = "shrink-0 px-1.5 py-0.5 font-sans text-[11px] leading-[normal] font-semibold text-ink-muted";

const readRecents = (): string[] => {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(RECENTS_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter((key): key is string => typeof key === "string").slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
};

const rememberPage = (key: string) => {
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify([key, ...readRecents().filter((other) => other !== key)].slice(0, RECENT_LIMIT)));
  } catch {
    // Blocked storage: nothing is remembered, the page still opens.
  }
};

// The round tile at the start of a row, as the admin palette draws them.
const Mark = ({ tone, icon: Glyph }: { tone: Tone; icon: Icon }) => (
  <IconTile tone={tone} size={32} round className="size-8.5">
    <Glyph />
  </IconTile>
);

interface PaletteAction {
  key: string;
  // An English key for t().
  label: string;
  sub?: string;
  // Words that find it besides its name, in both languages.
  context: string[];
  mark: React.ReactNode;
  href?: string;
  onSelect?: () => void;
}

// The top bar's search: a field on wide screens and an icon elsewhere, both
// opening a palette (also on Ctrl K or ⌘K) that finds pages, runs actions
// and finds people and transactions in the open workspace.
// iconClassName shapes the icon-only button (phones, and screens too
// narrow for the field), boxClassName the "Search or jump to…" field.
interface CustomerSearchProps {
  iconClassName?: string;
  boxClassName?: string;
  kbdClassName?: string;
}

export function CustomerSearch(props: CustomerSearchProps) {
  return (
    <WithAddActions>
      <SearchPalette {...props} />
    </WithAddActions>
  );
}

function SearchPalette({ iconClassName, boxClassName, kbdClassName }: CustomerSearchProps) {
  const { t, locale, fmt, toggleLocale } = useLocale();
  const { user, activeBusiness, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const darkModeOn = useFeature("dark_mode");
  const loansOn = useFeature("loan_management");
  const { actions: addActions, run } = useAddActions();
  const sections = useNavSections();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // The last answer for people and transactions, and what it answered.
  const [found, setFound] = useState<{ term: string; results: PaletteResults } | null>(null);
  const [recents, setRecents] = useState<string[]>([]);
  const latest = useRef("");
  // What had focus when it opened, and whether a row was picked: Esc puts
  // focus back where it was, a pick lets the page or drawer it opens keep it.
  const opener = useRef<HTMLElement | null>(null);
  const picked = useRef(false);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      picked.current = false;
      setRecents(readRecents());
      return;
    }
    setQuery("");
    setFound(null);
    // The palette reports a pick right after it closes.
    window.setTimeout(() => {
      if (!picked.current && opener.current?.isConnected) opener.current.focus();
    }, 0);
  }

  useCommandShortcut(() => changeOpen(!open));

  // Asks once typing pauses; an answer to an older query is dropped.
  useEffect(() => {
    const term = query.trim();
    latest.current = term;
    if (term.length < MIN_SEARCH) return;
    const timer = window.setTimeout(() => {
      const settle = (results: PaletteResults) => {
        if (latest.current === term) setFound({ term, results });
      };
      searchPaletteAction(term).then(
        (response) => settle(response.success && response.data ? response.data : NOTHING),
        () => settle(NOTHING),
      );
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const term = query.trim();
  const searching = term.length >= MIN_SEARCH;
  const results = searching ? found?.results : undefined;
  const currency = activeBusiness?.currency ?? "BDT";
  // The English and the reader's wording of a dictionary key.
  const both = (key: string) => [withoutContext(key), t(key)];

  // Built only while the palette is open.
  const pages = open ? palettePages(sections, NAV_FOOT, NAV_FOOT_LABEL, SETTINGS_SECTIONS) : [];
  const pageItem = (page: PalettePage, group: string): CommandItem => ({
    key: `${group}:${page.key}`,
    title: t(page.label),
    sub: page.trail.length > 0 ? page.trail.map((part) => t(part)).join(" › ") : undefined,
    mark: <Mark tone={page.tone} icon={PAGE_ICONS[page.icon] ?? FileText} />,
    href: page.href,
    onSelect: () => rememberPage(page.key),
  });
  const recentPages = term ? [] : recents.flatMap((key) => pages.filter((page) => page.key === key));
  const matchedPages = term ? rankMatches(term, pages, (page) => ({ titles: both(page.label), context: page.trail.flatMap(both) }), PAGE_LIMIT) : [];

  function changeLanguage() {
    const next = locale === "en" ? "bn" : "en";
    toggleLocale();
    void saveLanguageAction(next === "bn" ? "BN" : "EN");
  }

  const kind = workspaceKind(activeBusiness);
  const canSwitch = user.businesses.filter((business) => business.type !== "GROUP").length > 1;
  const themeHint = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  const paletteActions: PaletteAction[] = [
    ...addActions.map((action) => ({
      key: `add:${action.key}`,
      label: action.label,
      sub: t(action.hint),
      context: both(action.hint),
      mark: <Mark tone={action.tone} icon={ADD_ACTION_ICONS[action.icon]} />,
      onSelect: () => run(action),
    })),
    ...(canSwitch
      ? [{ key: "workspace", label: "Switch workspace", sub: t(`${kind} workspace`), context: both(`${kind} workspace`), mark: <Mark tone="neutral" icon={Repeat2} />, href: "/choose-workspace" }]
      : []),
    { key: "language", label: "Change language", sub: locale === "en" ? "বাংলা" : "English", context: ["English", "Bangla", "বাংলা"], mark: <Mark tone="neutral" icon={Languages} />, onSelect: changeLanguage },
    ...(darkModeOn ? [{ key: "theme", label: "Change theme", sub: t(themeHint), context: both(themeHint), mark: <Mark tone="neutral" icon={theme === "dark" ? Sun : Moon} />, onSelect: toggleTheme }] : []),
    { key: "sign-out", label: "Sign out", sub: user.email, context: [], mark: <Mark tone="expense" icon={LogOut} />, onSelect: logout },
  ];
  const shownActions = term ? rankMatches(term, paletteActions, (action) => ({ titles: both(action.label), context: action.context })) : paletteActions;

  // A loan contact opens its statement, a customer or supplier its Books
  // page; one whose pages this workspace doesn't show is left out.
  const contactHref = (contact: PaletteContact): string | null => {
    if (contact.category === "LOAN") return loansOn ? `/loan-management/ledger?contactId=${encodeURIComponent(contact.id)}` : null;
    return activeBusiness?.type === "BUSINESS" ? `/contacts/${encodeURIComponent(contact.id)}` : null;
  };
  const contactItems = (results?.contacts ?? []).flatMap((contact): CommandItem[] => {
    const href = contactHref(contact);
    const type = CONTACT_TYPE_LABELS[contact.type];
    return href
      ? [{ key: `contact:${contact.id}`, title: contact.name, sub: [type && t(type), contact.phone].filter(Boolean).join(" · "), mark: <CommandMark tone="forest">{contactInitials(contact.name)}</CommandMark>, href }]
      : [];
  });

  const dayText = (iso: string) => {
    const day = toDateInputValue(iso);
    if (!day) return "";
    return formatDay(day, "d MMM yyyy", fmt);
  };
  // The Add menu's own glyphs for money in, out and between wallets.
  const transactionMark = (type: PaletteTransaction["type"]) =>
    type === "INCOME" ? (
      <Mark tone="income" icon={ADD_ACTION_ICONS["money-in"]} />
    ) : type === "EXPENSE" ? (
      <Mark tone="expense" icon={ADD_ACTION_ICONS["money-out"]} />
    ) : type === "TRANSFER" ? (
      <Mark tone="vault" icon={ADD_ACTION_ICONS.between} />
    ) : (
      <Mark tone="neutral" icon={Receipt} />
    );
  const transactions = results?.transactions ?? [];
  const transactionItems: CommandItem[] = transactions.map((transaction) => {
    const typeLabel = TRANSACTION_TYPE_LABELS[transaction.type];
    const signed = transaction.type === "INCOME" || transaction.type === "EXPENSE";
    return {
      key: `transaction:${transaction.id}`,
      title: transaction.title ?? (typeLabel ? t(typeLabel) : t("Transaction")),
      sub: [dayText(transaction.date), transaction.wallet, transaction.cancelled && t(transaction.cancelled)].filter(Boolean).join(" · "),
      badge: signed ? formatSignedCurrency(transaction.amount, currency, fmt) : formatCurrency(Math.abs(transaction.amount), currency, fmt),
      mark: transactionMark(transaction.type),
      href: `/transactions/${encodeURIComponent(transaction.id)}`,
    };
  });
  if (transactions.length > 0) {
    transactionItems.push({ key: "transaction:all", title: t("See all matching transactions"), mark: <Mark tone="neutral" icon={Search} />, href: `/transactions?search=${encodeURIComponent(term)}` });
  }

  const groups: CommandGroup[] = [
    { label: t("Recent"), items: recentPages.map((page) => pageItem(page, "recent")) },
    { label: t("Pages"), items: matchedPages.map((page) => pageItem(page, "page")) },
    { label: t("Actions"), items: shownActions.map(({ key, label, sub, mark, href, onSelect }) => ({ key: `action:${key}`, title: t(label), sub, mark, href, onSelect })) },
    { label: t("Contacts"), items: contactItems },
    { label: t("Transactions"), items: transactionItems },
  ].map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      onSelect: () => {
        picked.current = true;
        item.onSelect?.();
      },
    })),
  }));

  const label = t("Search pages, people, transactions");

  return (
    <>
      <button
        type="button"
        onClick={() => changeOpen(true)}
        aria-label={label}
        aria-keyshortcuts="Control+K Meta+K"
        title={t("Search")}
        className={cn("flex shrink-0 items-center justify-center text-ink-soft transition-colors hover:text-ink xl:hidden", iconClassName)}
      >
        <Search className="size-5 md:size-4.5" strokeWidth={2} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => changeOpen(true)}
        aria-label={label}
        aria-keyshortcuts="Control+K Meta+K"
        className={cn("hidden h-9.5 w-70 shrink-0 items-center gap-2 border pr-1.5 pl-3 text-body whitespace-nowrap text-ink-muted transition-colors hover:border-line-strong xl:flex", boxClassName)}
      >
        <Search className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">{t("Search or jump to…")}</span>
        <Kbd className={cn(KBD, kbdClassName)}>Ctrl K</Kbd>
      </button>

      <CommandPalette
        open={open}
        onOpenChange={changeOpen}
        query={query}
        onQueryChange={setQuery}
        groups={groups}
        // People and transactions on their way: "Nothing found" would be a guess.
        loading={searching && found?.term !== term}
        minQueryLength={1}
        label={label}
        placeholder={t("Search pages, people, transactions…")}
        title={t("Search")}
        description={t("Finds pages, actions, people and transactions")}
        empty={t("Nothing found for “{query}”.", { query: term })}
        footer={
          <>
            <span>{t("↑ ↓ to move")}</span>
            <span>{t("Enter to open")}</span>
            <span>{t("Type 2 letters or more to find people and transactions")}</span>
          </>
        }
      />
    </>
  );
}
