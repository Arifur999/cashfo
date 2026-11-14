"use client";

import { ArrowDown, ArrowUpDown, Check, ChevronDown, LayoutGrid, List, Lock, Menu, PanelLeftClose, PanelLeftOpen, Plus, RefreshCw, Search, SearchX, ShieldAlert, Star, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import ErrorState from "@/components/smartly/ErrorState";
import Input from "@/components/smartly/form/Input";
import { ListCard, ListEmpty, ListFooter, ListHead, ListHeadCell } from "@/components/smartly/list";
import LoadMore from "@/components/smartly/LoadMore";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SkeletonRows from "@/components/smartly/SkeletonRows";
import { SOFT_TONE } from "@/components/smartly/tones";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { VaultEntryCategory, VaultEntrySummary } from "@/lib/customer/api";
import { deleteVaultEntryAction, dismissVaultCheckupAction, getVaultCheckupAction, revealVaultEntryAction, updateVaultEntryAction } from "@/lib/customer/passwordVaultActions";
import {
  attentionIds,
  categoryCounts,
  checkupFor,
  checkupStatus,
  chipViews,
  draftFor,
  entriesInView,
  filterEntries,
  hostOf,
  isLockedMessage,
  isSafetyView,
  issuesOf,
  normalizeUrl,
  safetyOf,
  settle,
  sharesWith,
  sortEntries,
  toggledView,
  vaultHealth,
  VAULT_SORTS,
  type CheckupAnswer,
  type EntryDraft,
  type QuickLogin,
  type SafetyView,
  type VaultSort,
  type VaultView,
} from "@/lib/customer/vaultDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { clearClipboardLater, copySecret, copyText } from "./clipboard";
import { EntryDetails } from "./EntryDetails";
import { EntryDialog } from "./EntryDialog";
import { EntryRow } from "./EntryRow";
import { EntryCard, EntryTableRow, TABLE_MIDDLE, TABLE_ROW } from "./EntryTableRow";
import { LockCountdown, LockPill } from "./LockCountdown";
import { VAULT_CATEGORIES, VAULT_CATEGORY_ICONS, VAULT_CATEGORY_LABELS, VAULT_CATEGORY_TONE } from "./vaultCategoryDisplay";
import { VaultCheckup } from "./VaultCheckup";
import { VaultEmpty } from "./VaultEmpty";
import { SAFETY_LIST_NAMES, VaultHealthBar } from "./VaultHealthBar";
import { useVaultSteps } from "./vaultSteps";

// The list's first answer: on its way, in, or never came.
export type VaultLoad = "loading" | "ready" | "failed";

// The Add or Edit popup as the page keeps it: open or closed (still holding
// its fields for the closing fade), and what was typed. Open, it is a step
// in the address too (?entry=, which VaultPageClient puts there).
export interface DrawerState {
  open: boolean;
  draft: EntryDraft;
}

interface VaultHomeProps {
  token: string;
  entries: VaultEntrySummary[];
  load: VaultLoad;
  onRetry: () => void;
  // When the vault locks, in epoch milliseconds.
  expiresAt: number;
  onEntries: Dispatch<SetStateAction<VaultEntrySummary[]>>;
  onLock: () => void;
  // The API answered that the session is over.
  onLocked: () => void;
  // Kept by the page, so a lock doesn't lose what was typed.
  drawer: DrawerState | null;
  onDrawer: Dispatch<SetStateAction<DrawerState | null>>;
}

const LIST_ID = "vault-list";
const PHONE_COLUMNS = "md:grid-cols-[minmax(0,1fr)_auto]";
// A long vault shows this many rows at a time, and adds as many per press.
const STEP = 50;
// A deleted login can be brought back this long; then it really goes.
const UNDO_MS = 6000;
// How long a copy button says Copied.
const COPIED_MS = 2000;
// The side menu, shown or hidden, is remembered on this device.
const NAV_KEY = "smartly-vault-nav";
const LAYOUT_KEY = "smartly-vault-layout";

const VIEWS: { value: VaultView; label: string; icon: typeof Menu; warn?: boolean }[] = [
  { value: "", label: "All logins", icon: Menu },
  { value: "FAVORITES", label: "Favorites", icon: Star },
  { value: "ATTENTION", label: "Needs attention", icon: TriangleAlert, warn: true },
];

// The wide table's sortable heads: Login, Website and Safety.
const HEAD_SORTS: { sort: VaultSort; label: string; tip: string }[] = [
  { sort: "az", label: "Login", tip: "Sort A to Z" },
  { sort: "updated", label: "Website", tip: "Sort by recently updated" },
  { sort: "fix", label: "Safety", tip: "Show logins that need a fix first" },
];

const readStored = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const store = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private windows may refuse; the choice lasts the visit.
  }
};

// The vault, open (design VaultHome): the health bar, the side menu of
// views and categories (hideable), search, sort and List or Cards, and the
// logins with Change and View. A login opens in a centred popup. Phones
// keep the board's one-tap copy rows (VaultMobile).
export function VaultHome({ token, entries, load, onRetry, expiresAt, onEntries, onLock, onLocked, drawer, onDrawer }: VaultHomeProps) {
  const { t, fmt } = useLocale();
  const steps = useVaultSteps();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<VaultSort>("az");
  const [view, setView] = useState<VaultView>("");
  // The page only opens on the client (after an unlock), so the stored
  // choices can be read straight away.
  const [navHidden, setNavHidden] = useState(() => readStored(NAV_KEY) === "hide");
  const [layout, setLayout] = useState<"list" | "cards">(() => (readStored(LAYOUT_KEY) === "cards" ? "cards" : "list"));
  const [checkupAnswer, setCheckupAnswer] = useState<CheckupAnswer | null>(null);
  // Bumped by Try again, which asks the checkup once more.
  const [checkupAttempt, setCheckupAttempt] = useState(0);
  const [isSaving, startSave] = useTransition();
  const [removing, setRemoving] = useState<VaultEntrySummary | null>(null);
  // A password on show, and the login whose password is on its way.
  const [revealed, setRevealed] = useState<{ id: string; password: string } | null>(null);
  const [revealing, setRevealing] = useState<string | null>(null);
  // The copy button just used, which says Copied for a moment.
  const [copied, setCopied] = useState<{ id: string; what: "username" | "password" } | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  // Deletes waiting out their Undo, and the token they will go with.
  const pendingDeletes = useRef(new Map<string, { entry: VaultEntrySummary; timer: ReturnType<typeof setTimeout> }>());
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  });

  // The login in the details popup: ?login=id, so Back closes it. Mirrored
  // here because Next catches up with pushState a moment later.
  const urlLogin = steps.value("login");
  const [detailsFor, setDetailsFor] = useState(urlLogin);
  const [seenUrlLogin, setSeenUrlLogin] = useState(urlLogin);
  if (urlLogin !== seenUrlLogin) {
    setSeenUrlLogin(urlLogin);
    setDetailsFor(urlLogin);
  }
  // The checkup is ?checkup=1, for the same reason.
  const checkupOpen = steps.value("checkup") === "1";

  // The checkup runs on the server whenever the logins change (and on Try
  // again); it answers ids.
  const checkupLocked = useEffectEvent(() => onLocked());
  useEffect(() => {
    if (entries.length === 0) return;
    let live = true;
    void settle(getVaultCheckupAction(token)).then((result) => {
      if (!live) return;
      if (result.success && result.data) setCheckupAnswer({ entries, attempt: checkupAttempt, found: result.data });
      else if (isLockedMessage(result.message)) checkupLocked();
      else setCheckupAnswer({ entries, attempt: checkupAttempt, found: null });
    });
    return () => {
      live = false;
    };
  }, [token, entries, checkupAttempt]);

  // The last findings stand in while a new run is on its way; with none on
  // hand it is loading, and a failed run claims nothing (checkupStatus).
  const { load: checkupLoad, found } = checkupStatus(checkupAnswer, entries, checkupAttempt);
  const retryCheckup = () => setCheckupAttempt((attempt) => attempt + 1);

  // The unlock button is gone: focus goes to the vault, unless a kept
  // login's popup opened with it and took focus itself.
  const focusOnOpen = useEffectEvent(() => {
    if (!drawer?.open) frame.current?.focus({ preventScroll: true });
  });
  useEffect(() => focusOnOpen(), []);

  // A delete waiting for its Undo goes now: on a lock (the page closes
  // while its token still works) or when the tab is closed.
  function commitDelete(entry: VaultEntrySummary) {
    pendingDeletes.current.delete(entry.id);
    void settle(deleteVaultEntryAction(tokenRef.current, entry.id)).then((result) => {
      if (result.success || isLockedMessage(result.message)) return;
      onEntries((list) => (list.some((e) => e.id === entry.id) ? list : [...list, entry]));
      toast.error(t(result.message ?? "Failed to delete entry"));
    });
  }
  const flushDeletes = useEffectEvent(() => {
    for (const { entry, timer } of [...pendingDeletes.current.values()]) {
      clearTimeout(timer);
      commitDelete(entry);
    }
  });
  useEffect(() => {
    const onHide = () => flushDeletes();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      flushDeletes();
    };
  }, []);

  // The phone's top bar Lock button calls the latest onLock, so it needn't
  // be drawn again whenever the page is.
  const onLockRef = useRef(onLock);
  useEffect(() => {
    onLockRef.current = onLock;
  });

  const checkup = useMemo(() => checkupFor(entries, found), [entries, found]);
  const flagged = useMemo(() => attentionIds(checkup), [checkup]);
  const counts = useMemo(() => categoryCounts(entries), [entries]);
  const health = useMemo(() => (checkup ? vaultHealth(entries, checkup) : null), [entries, checkup]);
  const visible = useMemo(() => sortEntries(filterEntries(entriesInView(entries, view, flagged, checkup), query, ""), sort, checkup), [entries, view, flagged, checkup, query, sort]);
  const favorites = entries.filter((entry) => entry.isFavorite).length;

  // Empty means an answer said so; a list on its way or one that never came
  // is neither "no logins" nor a count of zero.
  const loading = load === "loading" && entries.length === 0;
  const failed = load === "failed" && entries.length === 0;
  const empty = load === "ready" && entries.length === 0;
  const canAdd = load === "ready" && entries.length > 0;
  // Open, the checkup stays the step on screen even with no answer on hand
  // (it says why), so the list never shows under ?checkup=1.
  const showCheckup = checkupOpen && canAdd;

  // A long list grows 50 at a time, for the view, search and sort it grew under.
  const filterKey = `${view}|${query.trim()}|${sort}`;
  const [grown, setGrown] = useState({ key: filterKey, count: STEP });
  const shownCount = grown.key === filterKey ? grown.count : STEP;
  const rows = visible.slice(0, shownCount);

  const selected = detailsFor ? (entries.find((entry) => entry.id === detailsFor) ?? null) : null;
  // A password on show belongs to the login on show; another hides it.
  if (revealed && revealed.id !== selected?.id) setRevealed(null);

  // Copied goes back to Copy after a moment.
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(null), COPIED_MS);
    return () => clearTimeout(id);
  }, [copied]);

  const n = (value: number) => formatCount(value, fmt);

  function showLogin(id: string) {
    setDetailsFor(id);
    steps.open("login", id);
  }

  function closeDetails() {
    setDetailsFor(null);
    steps.close("login");
  }

  function openCheckup() {
    steps.open("checkup", "1");
  }

  function closeCheckup() {
    steps.close("checkup");
  }

  function pickView(next: VaultView) {
    setView(toggledView(view, next));
  }

  function toggleNav() {
    const next = !navHidden;
    setNavHidden(next);
    store(NAV_KEY, next ? "hide" : "show");
  }

  function pickLayout(next: "list" | "cards") {
    setLayout(next);
    store(LAYOUT_KEY, next);
  }

  function copyShown(text: string, message: string) {
    void copyText(text).then((done) => (done ? toast.success(message) : toast.error(t("Couldn't copy. Select the text and copy it yourself."))));
  }

  function copyUsername(entry: VaultEntrySummary) {
    if (!entry.usernameOrEmail) return;
    const username = entry.usernameOrEmail;
    void copyText(username).then((done) => {
      if (!done) {
        toast.error(t("Couldn't copy. Select the text and copy it yourself."));
        return;
      }
      setCopied({ id: entry.id, what: "username" });
      toast.success(t("{title} username copied", { title: entry.title }));
    });
  }

  // The password from the server; null when it didn't come (said already).
  function fetchPassword(entry: VaultEntrySummary): Promise<string | null> {
    setRevealing(entry.id);
    return settle(revealVaultEntryAction(token, entry.id)).then((result) => {
      setRevealing((id) => (id === entry.id ? null : id));
      if (result.success && result.data) return result.data.password;
      if (isLockedMessage(result.message)) onLocked();
      else toast.error(t(result.message ?? "Failed to reveal password"));
      return null;
    });
  }

  function toggleReveal(entry: VaultEntrySummary) {
    if (revealed?.id === entry.id) {
      setRevealed(null);
      return;
    }
    void fetchPassword(entry).then((password) => {
      if (password !== null) setRevealed({ id: entry.id, password });
    });
  }

  // Started inside the tap (see clipboard.ts). When the browser still
  // refuses, the login opens with its password shown, so "select the text"
  // is something the reader can do. A copied password leaves the clipboard
  // after 30 seconds.
  function copyPassword(entry: VaultEntrySummary) {
    const known = revealed?.id === entry.id ? revealed.password : null;
    const password = known !== null ? Promise.resolve(known) : fetchPassword(entry);
    void copySecret(password).then(async (outcome) => {
      if (outcome === "copied") {
        clearClipboardLater();
        setCopied({ id: entry.id, what: "password" });
        toast.success(t("{title} password copied", { title: entry.title }), { description: t("The clipboard clears in 30 seconds.") });
      } else if (outcome === "failed") {
        const value = await password;
        if (value !== null) {
          showLogin(entry.id);
          setRevealed({ id: entry.id, password: value });
        }
        toast.error(t("Couldn't copy. Select the text and copy it yourself."));
      }
    });
  }

  function upsert(entry: VaultEntrySummary) {
    onEntries((list) => (list.some((e) => e.id === entry.id) ? list.map((e) => (e.id === entry.id ? entry : e)) : [...list, entry]));
  }

  // A saved login shows in the list (every login, the search cleared), except
  // from the checkup, which stays on screen.
  function saved(entry: VaultEntrySummary) {
    upsert(entry);
    if (checkupOpen) return;
    if (!drawer?.draft.editing) {
      setView("");
      setQuery("");
    }
  }

  // Close, Cancel, Escape and a save take the popup's step off the address
  // (the way Back would, as it was put there), then close it.
  function closeDrawer() {
    steps.close("entry");
    onDrawer((current) => current && { ...current, open: false });
  }

  // Deleting takes the login off the list at once; it really goes when its
  // Undo runs out.
  function remove() {
    if (!removing) return;
    const target = removing;
    setRemoving(null);
    if (detailsFor === target.id) closeDetails();
    onEntries((list) => list.filter((e) => e.id !== target.id));
    const timer = setTimeout(() => commitDelete(target), UNDO_MS);
    pendingDeletes.current.set(target.id, { entry: target, timer });
    toast(t("{title} deleted", { title: target.title }), { duration: UNDO_MS, action: { label: t("Undo"), onClick: () => undoDelete(target) } });
  }

  function undoDelete(entry: VaultEntrySummary) {
    const pending = pendingDeletes.current.get(entry.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingDeletes.current.delete(entry.id);
    onEntries((list) => (list.some((e) => e.id === entry.id) ? list : [...list, entry]));
    toast.success(t("{title} is back", { title: entry.title }));
  }

  function toggleFavorite(entry: VaultEntrySummary) {
    startSave(async () => {
      const result = await settle(updateVaultEntryAction(token, entry.id, { isFavorite: !entry.isFavorite }));
      if (result.success && result.data) {
        upsert(result.data);
        toast.success(t(result.data.isFavorite ? "Added to favorites" : "Removed from favorites"));
      } else if (isLockedMessage(result.message)) onLocked();
      else toast.error(t(result.message ?? "Failed to update vault entry"));
    });
  }

  // "It's fine" updates the login where it is; nothing opens.
  function markFine(entry: VaultEntrySummary) {
    startSave(async () => {
      const result = await settle(dismissVaultCheckupAction(token, entry.id));
      if (result.success && result.data) {
        upsert(result.data);
        toast.success(t("Marked {title} as fine", { title: entry.title }), { description: t("It won't show here again until it's a year older.") });
      } else if (isLockedMessage(result.message)) onLocked();
      else toast.error(t(result.message ?? "Failed to update vault entry"));
    });
  }

  // A blank login starts as Social (VaultEntryDrawer); the empty vault's
  // Something else starts as Other.
  const openAdd = (preset: QuickLogin | null = null, category: VaultEntryCategory = "SOCIAL") => onDrawer({ open: true, draft: { ...draftFor(null, preset, t), ...(!preset && { category }) } });
  const openEdit = (entry: VaultEntrySummary, change = false) => onDrawer({ open: true, draft: { ...draftFor(entry, null, t), change } });

  // Change from the checkup: the website to set a new password there, and
  // the login to save it.
  function changeOnSite(entry: VaultEntrySummary) {
    const host = hostOf(entry.websiteUrl);
    if (entry.websiteUrl) window.open(normalizeUrl(entry.websiteUrl), "_blank", "noopener,noreferrer");
    openEdit(entry, true);
    toast(host ? t("Opened {site} in a new tab", { site: host }) : t("Change it on the device first"), { description: t("Set the new password there, then save it here.") });
  }

  // The rows' handlers, made once. Each calls the latest one through this
  // ref (kept current like onLockRef), so the memoised rows aren't drawn
  // again with the page, which is every keystroke in the popup.
  const rowActions = useRef({ showLogin, copyUsername, copyPassword, openEdit });
  useEffect(() => {
    rowActions.current = { showLogin, copyUsername, copyPassword, openEdit };
  });
  const viewRow = useCallback((id: string) => rowActions.current.showLogin(id), []);
  const copyRowUsername = useCallback((entry: VaultEntrySummary) => rowActions.current.copyUsername(entry), []);
  const copyRowPassword = useCallback((entry: VaultEntrySummary) => rowActions.current.copyPassword(entry), []);
  const changeRow = useCallback((entry: VaultEntrySummary) => rowActions.current.openEdit(entry, true), []);

  const viewLabel = (value: VaultView) =>
    value === "" ? t("All logins") : value === "FAVORITES" ? t("Favorites") : value === "ATTENTION" ? t("Needs attention") : isSafetyView(value) ? t(SAFETY_LIST_NAMES[value]) : t(VAULT_CATEGORY_LABELS[value]);
  const chipLabel = (value: VaultView) => (value === "" ? t("All") : value === "FAVORITES" ? `★ ${t("Favorites")}` : viewLabel(value));
  const viewCount = (value: VaultView) => (value === "" ? entries.length : value === "FAVORITES" ? favorites : value === "ATTENTION" ? flagged.size : isSafetyView(value) ? visible.length : counts[value]);
  // A count is shown once there is one: the list's answer for every view,
  // and the checkup's too for the problem views.
  const countKnown = (value: VaultView) => !loading && (!(value === "ATTENTION" || isSafetyView(value)) || checkupLoad === "ready");
  const listLabel = viewLabel(view);
  const summary =
    checkup && flagged.size > 0
      ? t(flagged.size === 1 ? "{count} login needs attention: {reused} reused, {weak} weak, {old} old." : "{count} logins need attention: {reused} reused, {weak} weak, {old} old.", { count: n(flagged.size), reused: n(checkup.reused.length), weak: n(checkup.weak.length), old: n(checkup.old.length) })
      : t("Every login looks fine.");
  const total = entries.length;
  const searchPlaceholder = loading ? t("Search logins") : t(total === 1 ? "Search {count} login" : "Search {count} logins", { count: n(total) });
  const searched = query.trim();
  const sortLabel = t(VAULT_SORTS.find((option) => option.value === sort)?.label ?? "A to Z");
  // The list's title carries a Show all logins chip when a filter is on that
  // the side menu doesn't show: the menu is hidden, or a health chip is on.
  const filterChip = view !== "" && (navHidden || isSafetyView(view));

  const subtitle = useMemo(() => <LockCountdown expiresAt={expiresAt} />, [expiresAt]);
  const lockButton = useMemo(
    () => (
      <button type="button" onClick={() => onLockRef.current()} aria-label={t("Lock now")} title={t("Lock now")} className="flex size-11 items-center justify-center rounded-md text-ink-2 hover:bg-surface-sunken">
        <Lock className="size-5" aria-hidden="true" />
      </button>
    ),
    [t],
  );

  const showAll = view !== "" && (
    <Button variant="secondary" size="sm" onClick={() => setView("")} className="pointer-coarse:h-11">
      {searched ? t("Search all logins") : t("Show all logins")}
    </Button>
  );
  // A problem view with no checkup answer on hand says so, never "No logins
  // need attention".
  const problemView = view === "ATTENTION" || isSafetyView(view);
  const noMatch =
    problemView && checkupLoad === "loading" ? (
      <ListEmpty title={t("Checking your logins…")} />
    ) : problemView && checkupLoad === "failed" ? (
      <ListEmpty
        icon={<ShieldAlert />}
        tone="warning"
        title={t("The security checkup couldn't run.")}
        action={
          <>
            <Button variant="secondary" size="sm" onClick={retryCheckup} className="pointer-coarse:h-11">
              <RefreshCw />
              {t("Try again")}
            </Button>
            {showAll}
          </>
        }
      />
    ) : (
      <ListEmpty
        icon={<SearchX />}
        title={
          searched
            ? view === ""
              ? t("No logins match “{query}”.", { query: searched })
              : t("No logins match “{query}” in {view}.", { query: searched, view: listLabel })
            : view === "FAVORITES"
              ? t("No favorites yet. Star a login to keep it here.")
              : problemView
                ? t("No logins need attention.")
                : t("No logins in {view} yet.", { view: listLabel })
        }
        description={searched ? t("Try part of the name, the username or the website.") : undefined}
        action={
          <>
            {showAll}
            {searched && (
              <Button variant="ghost" size="sm" onClick={() => setQuery("")} className="pointer-coarse:h-11">
                {t("Clear search")}
              </Button>
            )}
          </>
        }
      />
    );

  const searchBox = (className: string, inputSize: "md" | "lg") => (
    <Input
      size={inputSize}
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      placeholder={searchPlaceholder}
      aria-label={t("Search logins")}
      type="search"
      leading={<Search />}
      trailing={
        query ? (
          <button type="button" onClick={() => setQuery("")} aria-label={t("Clear search")} className="mr-1 flex size-7 items-center justify-center rounded-full bg-surface-sunken text-ink-soft hover:text-ink pointer-coarse:size-9">
            <X className="size-3.25" strokeWidth={2.5} aria-hidden="true" />
          </button>
        ) : undefined
      }
      frameClassName={className}
      className="[&::-webkit-search-cancel-button]:hidden"
    />
  );

  const chips = (
    <div role="group" aria-label={t("Filter")} className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0 lg:hidden">
      {chipViews(counts, view, VAULT_CATEGORIES).map((value) => {
        const on = view === value;
        return (
          <button
            key={value || "all"}
            type="button"
            aria-pressed={on}
            onClick={() => pickView(value)}
            className={cn("flex h-8.5 shrink-0 items-center gap-1.5 rounded-full px-3 text-small font-medium pointer-coarse:h-11", on ? "bg-emerald font-semibold text-on-action" : "border border-line bg-surface text-ink-2")}
          >
            {chipLabel(value)}
            {countKnown(value) && <span className="opacity-70 tabular-nums">{n(viewCount(value))}</span>}
          </button>
        );
      })}
    </div>
  );

  const sideMenu = (
    <nav id="vault-menu" aria-label={t("Vault sections")} className="hidden flex-col gap-0.5 leading-[normal] lg:flex">
      {VIEWS.map((item) => {
        const on = view === item.value;
        return (
          <button key={item.value || "all"} type="button" aria-current={on ? "page" : undefined} onClick={() => pickView(item.value)} className={cn("flex h-10 items-center gap-2.5 rounded-[10px] px-2.5 text-body", on ? "bg-emerald-soft font-semibold text-emerald" : "font-medium text-ink-2 hover:bg-surface-sunken")}>
            <item.icon className={cn("size-4", !on && (item.warn ? "text-warning" : "text-ink-muted"))} aria-hidden="true" />
            <span className="flex-1 text-left">{t(item.label)}</span>
            {countKnown(item.value) && (
              <span className={cn("min-w-5.5 rounded-full px-1.75 py-px text-center text-caption font-semibold tabular-nums", on ? "bg-surface text-emerald" : item.warn ? "bg-warning-soft text-warning" : "bg-surface-sunken text-ink-2")}>{n(viewCount(item.value))}</span>
            )}
          </button>
        );
      })}
      <span className="mx-2.5 mt-3.5 mb-1.5 text-[11px] leading-[normal] font-semibold tracking-[0.06em] text-ink-muted uppercase">{t("Categories")}</span>
      {VAULT_CATEGORIES.filter((value) => counts[value] > 0 || view === value).map((value) => {
        const Icon = VAULT_CATEGORY_ICONS[value];
        const on = view === value;
        return (
          <button key={value} type="button" aria-current={on ? "page" : undefined} onClick={() => pickView(value)} className={cn("flex h-9.5 items-center gap-2.5 rounded-[10px] px-2.5 text-[13.5px]", on ? "bg-emerald-soft font-semibold text-emerald" : "font-medium text-ink-2 hover:bg-surface-sunken")}>
            <span aria-hidden="true" className={cn("flex size-6.5 items-center justify-center rounded-lg [&_svg]:size-3.25", SOFT_TONE[VAULT_CATEGORY_TONE[value]])}>
              <Icon />
            </span>
            <span className="flex-1 text-left">{t(VAULT_CATEGORY_LABELS[value])}</span>
            <span className="text-caption text-ink-faint tabular-nums">{n(counts[value])}</span>
          </button>
        );
      })}
      <button type="button" onClick={() => openAdd()} className="mt-1.5 flex h-9.5 items-center gap-2.5 rounded-[10px] border border-dashed border-line-strong px-2.5 text-[13.5px] font-semibold text-emerald hover:bg-emerald-soft">
        <Plus className="size-3.75" strokeWidth={2.25} aria-hidden="true" />
        {t("Add login")}
      </button>
    </nav>
  );

  const wideList =
    visible.length === 0 ? (
      <Card padding="none" className="border-dashed shadow-none">
        {noMatch}
      </Card>
    ) : layout === "cards" ? (
      <div className={cn("grid gap-3 md:grid-cols-2", navHidden ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
        {rows.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            safety={safetyOf(checkup, entry.id)}
            copied={copied?.id === entry.id ? copied.what : null}
            onView={viewRow}
            onCopyUsername={copyRowUsername}
            onCopyPassword={copyRowPassword}
          />
        ))}
      </div>
    ) : (
      <Card padding="none" role="table" aria-label={listLabel} className="overflow-x-auto">
        <div className="min-w-180">
          <div role="row" className={cn(TABLE_ROW, "h-10.5 border-b border-line-card bg-table-head leading-[normal]")}>
            <span role="columnheader" className="w-12 shrink-0 text-center text-caption font-semibold tracking-[0.03em] text-ink-muted uppercase">
              #
            </span>
            <div className={TABLE_MIDDLE}>
              {HEAD_SORTS.map((head) => {
                const on = sort === head.sort;
                return (
                  <span key={head.sort} role="columnheader" aria-sort={on ? (head.sort === "az" ? "ascending" : "descending") : "none"}>
                    <button type="button" onClick={() => setSort(head.sort)} title={t(head.tip)} className={cn("-ml-1.5 flex h-7 items-center gap-1.25 rounded-md px-1.5 text-caption font-semibold tracking-[0.03em] uppercase hover:bg-surface-sunken", on ? "text-brand-ink" : "text-ink-muted")}>
                      {t(head.label)}
                      <ArrowDown className={cn("size-3", !on && "opacity-0")} strokeWidth={2.5} aria-hidden="true" />
                    </button>
                  </span>
                );
              })}
            </div>
            <span role="columnheader" className="w-28 shrink-0 text-center text-caption font-semibold tracking-[0.03em] text-ink-muted uppercase">
              {t("Change")}
            </span>
            <span role="columnheader" className="w-25 shrink-0 text-center text-caption font-semibold tracking-[0.03em] text-ink-muted uppercase">
              {t("View")}
            </span>
          </div>
          <div role="rowgroup">
            {rows.map((entry, index) => (
              <EntryTableRow key={entry.id} entry={entry} number={index + 1} safety={safetyOf(checkup, entry.id)} onView={viewRow} onChange={changeRow} />
            ))}
          </div>
        </div>
      </Card>
    );

  const loadMore =
    visible.length > STEP ? (
      <LoadMore shown={rows.length} total={visible.length} step={STEP} onMore={() => setGrown({ key: filterKey, count: shownCount + STEP })} onLess={shownCount > STEP ? () => setGrown({ key: filterKey, count: STEP }) : undefined} focusTargetId={LIST_ID} />
    ) : null;

  return (
    // Focus lands here after the unlock: a named region a screen reader announces.
    <PageFrame ref={frame} tabIndex={-1} role="region" aria-label={t("Password Manager")} className="gap-4.5 outline-none md:pt-7">
      <TopbarExtras record={showCheckup ? t("Security checkup") : undefined} subtitle={subtitle} action={lockButton} />
      {/* Phones name the page in the top bar, so the heading is for screen readers there. */}
      {/* The checkup (design VaultHealth) has no header: the top bar names it, a back link leads home. */}
      <h1 className={cn("sr-only", !showCheckup && "md:hidden")}>{t(showCheckup ? "Security checkup" : "Password Manager")}</h1>
      <PageHeader
        className={cn("max-md:hidden md:items-center", showCheckup && "hidden")}
        title={t("Password Manager")}
        actions={
          <>
            <LockPill expiresAt={expiresAt} onLock={onLock} />
            {/* A list on its way can't be added to yet. */}
            {load === "ready" && (
              <Button onClick={() => openAdd()} className="h-10">
                <Plus strokeWidth={2.5} />
                {t("Add login")}
              </Button>
            )}
          </>
        }
      />

      {failed ? (
        <ErrorState title={t("Couldn't load your logins")} onRetry={onRetry} />
      ) : empty ? (
        <VaultEmpty onPick={(preset) => openAdd(preset, "OTHER")} />
      ) : showCheckup ? (
        <VaultCheckup entries={entries} checkup={checkup} failed={checkupLoad === "failed"} onRetry={retryCheckup} busy={isSaving} onBack={closeCheckup} onChange={changeOnSite} onFine={markFine} />
      ) : (
        <>
          {/* Phones (VaultMobile): one white band under the bar with the search, the sort and the chips. */}
          <div className="-mx-4 -mt-5 flex flex-col gap-2.5 border-b border-line bg-surface px-4 pt-3 pb-2 md:hidden">
            <div className="flex gap-2">
              {searchBox("h-11.5 flex-1 rounded-[12px] bg-strip text-body-lg", "md")}
              {/* The select is laid over the icon, so a tap opens the phone's own picker. */}
              <label className="relative flex size-11.5 shrink-0 items-center justify-center rounded-[12px] border border-line-strong bg-surface text-ink-2 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring">
                <ArrowUpDown className="size-5" aria-hidden="true" />
                {sort !== "az" && <span aria-hidden="true" className="absolute top-2 right-2 size-2 rounded-full bg-emerald" />}
                <select value={sort} onChange={(event) => setSort(event.target.value as VaultSort)} aria-label={t("Sort")} className="absolute inset-0 cursor-pointer appearance-none text-body-lg opacity-0">
                  {VAULT_SORTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {chips}
          </div>

          {checkup && flagged.size > 0 && (
            <button type="button" onClick={openCheckup} className="flex items-center gap-2 rounded-[10px] border border-warning-line bg-warning-50 px-3 py-2.5 text-left text-small text-warning-ink md:hidden">
              <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{summary}</span>
              <span className="font-semibold">{t("Security checkup")}</span>
            </button>
          )}

          <div className="max-md:hidden">
            <VaultHealthBar health={health} load={checkupLoad} view={view} onFilter={(next: SafetyView) => pickView(next)} onFix={openCheckup} onRetry={retryCheckup} />
          </div>

          <div className={cn("grid items-start gap-5 max-md:-mx-4 max-md:-mt-4", !navHidden && "lg:grid-cols-[212px_minmax(0,1fr)]")}>
            {!navHidden && sideMenu}

            <section aria-label={t("Logins")} className="flex min-w-0 flex-col gap-3">
              {/* Wide screens: the menu button, the search, the sort and the layout. */}
              <div className="flex gap-2.5 max-md:hidden">
                <button
                  type="button"
                  onClick={toggleNav}
                  aria-controls="vault-menu"
                  aria-expanded={!navHidden}
                  aria-label={t(navHidden ? "Show menu" : "Hide menu")}
                  title={t(navHidden ? "Show menu" : "Hide menu")}
                  className={cn("hidden size-11 shrink-0 items-center justify-center rounded-[12px] border lg:flex", navHidden ? "border-emerald-line bg-emerald-soft text-brand-ink" : "border-input bg-surface text-ink-muted hover:bg-surface-sunken")}
                >
                  {navHidden ? <PanelLeftOpen className="size-4.5" aria-hidden="true" /> : <PanelLeftClose className="size-4.5" aria-hidden="true" />}
                </button>
                {searchBox("h-11 flex-1 rounded-[12px] text-[14.5px]", "md")}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="flex h-11 shrink-0 items-center gap-2 rounded-[12px] border border-input bg-surface px-3.5 text-[13.5px] font-medium whitespace-nowrap text-ink hover:bg-surface-sunken">
                      <ArrowUpDown className="size-3.75 text-ink-muted" aria-hidden="true" />
                      <span className="sr-only">{t("Sort")}: </span>
                      {sortLabel}
                      <ChevronDown className="size-3.5 text-ink-muted" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52.5 rounded-[12px] p-1.5">
                    <DropdownMenuRadioGroup value={sort} onValueChange={(value) => setSort(value as VaultSort)}>
                      {VAULT_SORTS.map((option) => (
                        <DropdownMenuRadioItem key={option.value} value={option.value} className={cn("h-9 rounded-lg pr-2.5 pl-2.5 text-[13.5px] [&>span:first-child]:hidden", sort === option.value && "bg-emerald-soft font-semibold")}>
                          <span className="flex-1">{t(option.label)}</span>
                          {sort === option.value && <Check className="size-3.5 text-emerald" strokeWidth={2.75} aria-hidden="true" />}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div role="radiogroup" aria-label={t("Layout")} className="flex h-11 shrink-0 gap-0.5 rounded-[12px] border border-input bg-surface p-0.75">
                  {(["list", "cards"] as const).map((value) => {
                    const on = layout === value;
                    const Icon = value === "list" ? List : LayoutGrid;
                    const label = t(value === "list" ? "List" : "Cards");
                    return (
                      <button key={value} type="button" role="radio" aria-checked={on} aria-label={label} title={label} onClick={() => pickLayout(value)} className={cn("flex w-9.5 items-center justify-center rounded-[9px]", on ? "bg-emerald-soft text-brand-ink" : "text-ink-muted hover:bg-surface-sunken")}>
                        <Icon className="size-4" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="max-md:hidden lg:hidden">{chips}</div>

              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 max-md:hidden">
                <span className="flex items-center gap-2.5">
                  <span className="text-[15px] leading-[normal] font-semibold text-ink">
                    {listLabel}
                    {countKnown(view) && <span className="font-medium text-ink-faint"> · {n(visible.length)}</span>}
                  </span>
                  {filterChip && (
                    <button type="button" onClick={() => setView("")} className="flex h-7 items-center gap-1.5 rounded-full border border-line-strong bg-surface pr-2.5 pl-3 text-[12.5px] font-medium text-ink-2 hover:bg-surface-sunken pointer-coarse:h-11">
                      {t("Show all logins")}
                      <X className="size-3" strokeWidth={2.5} aria-hidden="true" />
                    </button>
                  )}
                </span>
                {layout === "list" && <span className="text-[12.5px] leading-[normal] text-ink-muted">{t("Press View to see everything about a login")}</span>}
              </div>

              {loading ? (
                <Card padding="none" className="overflow-hidden max-md:rounded-none max-md:border-0 max-md:shadow-none">
                  <SkeletonRows rows={5} />
                </Card>
              ) : (
                <>
                  {/* Phones: the one-tap copy rows. */}
                  <ListCard id={LIST_ID} label={listLabel} className="max-md:rounded-none max-md:border-0 max-md:shadow-none md:hidden" footer={loadMore ? <ListFooter>{loadMore}</ListFooter> : undefined}>
                    <ListHead columns={PHONE_COLUMNS}>
                      <ListHeadCell>{countKnown(view) ? `${listLabel} · ${n(visible.length)}` : listLabel}</ListHeadCell>
                      <ListHeadCell align="end">{t("Copy")}</ListHeadCell>
                    </ListHead>
                    {visible.length === 0
                      ? noMatch
                      : rows.map((entry) => (
                          <EntryRow key={entry.id} entry={entry} columns={PHONE_COLUMNS} selected={false} attention={flagged.has(entry.id)} onSelect={viewRow} onCopyUsername={copyRowUsername} onCopyPassword={copyRowPassword} />
                        ))}
                  </ListCard>
                  <div id={`${LIST_ID}-wide`} className="flex flex-col gap-3 max-md:hidden">
                    {wideList}
                    {loadMore && <div className="flex justify-center">{loadMore}</div>}
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}

      {canAdd && (
        <button type="button" onClick={() => openAdd()} aria-label={t("Add login")} className="fixed right-4 bottom-6 z-30 flex size-14.5 items-center justify-center rounded-[18px] bg-forest text-white shadow-float md:hidden dark:bg-emerald dark:text-on-action">
          <Plus className="size-6" strokeWidth={2.25} aria-hidden="true" />
        </button>
      )}

      <EntryDetails
        entry={selected}
        onClose={closeDetails}
        issues={selected ? issuesOf(checkup, selected.id) : []}
        safety={selected ? safetyOf(checkup, selected.id) : null}
        sharedWith={selected ? sharesWith(entries, checkup, selected.id) : []}
        revealed={selected && revealed?.id === selected.id ? revealed.password : null}
        busy={selected !== null && revealing === selected.id}
        copied={selected && copied?.id === selected.id ? copied.what : null}
        onToggleReveal={() => selected && toggleReveal(selected)}
        onCopyPassword={() => selected && copyPassword(selected)}
        onCopyUsername={() => selected && copyUsername(selected)}
        onCopy={copyShown}
        onFavorite={() => selected && toggleFavorite(selected)}
        onEdit={() => selected && openEdit(selected)}
        onFix={() => selected && openEdit(selected, true)}
        onDelete={() => selected && setRemoving(selected)}
      />
      <EntryDialog open={drawer?.open ?? false} draft={drawer?.draft ?? null} token={token} onChange={(draft) => onDrawer({ open: true, draft })} onClose={closeDrawer} onSaved={saved} onLocked={onLocked} />
      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        danger
        title={removing ? t("Delete {title}?", { title: removing.title }) : ""}
        description={removing ? t("The saved username and password are removed from your vault. The account itself on {site} is not touched.", { site: hostOf(removing.websiteUrl) || t("that site") }) : ""}
        confirmLabel={t("Delete login")}
        cancelLabel={t("Keep it")}
      />
    </PageFrame>
  );
}
