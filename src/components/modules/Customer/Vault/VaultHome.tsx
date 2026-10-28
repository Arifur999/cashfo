"use client";

import { ArrowUpDown, Lock, Menu, Plus, RefreshCw, Search, SearchX, ShieldAlert, ShieldCheck, Star, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import ErrorState from "@/components/smartly/ErrorState";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListEmpty, ListFooter, ListHead, ListHeadCell } from "@/components/smartly/list";
import LoadMore from "@/components/smartly/LoadMore";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SkeletonRows from "@/components/smartly/SkeletonRows";
import { SOFT_TONE } from "@/components/smartly/tones";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { VaultEntrySummary } from "@/lib/customer/api";
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
  isLockedMessage,
  issuesOf,
  normalizeUrl,
  settle,
  sortEntries,
  toggledView,
  VAULT_SORTS,
  type CheckupAnswer,
  type EntryDraft,
  type QuickLogin,
  type VaultSort,
  type VaultView,
} from "@/lib/customer/vaultDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { copySecret, copyText } from "./clipboard";
import { EntryDetails } from "./EntryDetails";
import { EntryDrawer } from "./EntryDrawer";
import { EntryRow } from "./EntryRow";
import { LockCountdown } from "./LockCountdown";
import { VAULT_CATEGORIES, VAULT_CATEGORY_ICONS, VAULT_CATEGORY_LABELS, VAULT_CATEGORY_TONE } from "./vaultCategoryDisplay";
import { VaultCheckup } from "./VaultCheckup";
import { VaultEmpty } from "./VaultEmpty";
import { useVaultSteps } from "./vaultSteps";

// The list's first answer: on its way, in, or never came.
export type VaultLoad = "loading" | "ready" | "failed";

// The Add or Edit drawer as the page keeps it: open or closed (still
// holding its fields for the closing slide), and what was typed. Open, it
// is a step in the address too (?entry=, which VaultPageClient puts there).
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
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_auto]";
// A long vault shows this many rows at a time, and adds as many per press.
const STEP = 50;

const VIEWS: { value: VaultView; label: string; icon: typeof Menu; warn?: boolean }[] = [
  { value: "", label: "All logins", icon: Menu },
  { value: "FAVORITES", label: "Favorites", icon: Star },
  { value: "ATTENTION", label: "Needs attention", icon: TriangleAlert, warn: true },
];

// The vault, open: search, the list with one-tap copy, and the picked
// login's details beside it (below it, as a sheet, on a phone); and the
// security checkup.
export function VaultHome({ token, entries, load, onRetry, expiresAt, onEntries, onLock, onLocked, drawer, onDrawer }: VaultHomeProps) {
  const { t, fmt } = useLocale();
  const wide = useMediaQuery("(min-width: 1024px)");
  const steps = useVaultSteps();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<VaultSort>("az");
  const [view, setView] = useState<VaultView>("");
  const [checkupAnswer, setCheckupAnswer] = useState<CheckupAnswer | null>(null);
  // Bumped by Try again, which asks the checkup once more.
  const [checkupAttempt, setCheckupAttempt] = useState(0);
  const [isSaving, startSave] = useTransition();
  // The login in the wide screen's details pane.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<VaultEntrySummary | null>(null);
  const [isRemoving, startRemove] = useTransition();
  // A password on show, and the login whose password is on its way.
  const [revealed, setRevealed] = useState<{ id: string; password: string } | null>(null);
  const [revealing, setRevealing] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  // The login in the phone's sheet: ?login=id, so Back closes the sheet.
  // Mirrored here because Next catches up with pushState a moment later.
  const urlLogin = steps.value("login");
  const [sheetFor, setSheetFor] = useState(urlLogin);
  const [seenUrlLogin, setSeenUrlLogin] = useState(urlLogin);
  if (urlLogin !== seenUrlLogin) {
    setSeenUrlLogin(urlLogin);
    setSheetFor(urlLogin);
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
  // login's drawer opened with it and took focus itself.
  const focusOnOpen = useEffectEvent(() => {
    if (!drawer?.open) frame.current?.focus({ preventScroll: true });
  });
  useEffect(() => focusOnOpen(), []);

  // The top bar's Lock button calls the latest onLock, so it needn't be
  // drawn again whenever the page is.
  const onLockRef = useRef(onLock);
  useEffect(() => {
    onLockRef.current = onLock;
  });

  const checkup = useMemo(() => checkupFor(entries, found), [entries, found]);
  const flagged = useMemo(() => attentionIds(checkup), [checkup]);
  const counts = useMemo(() => categoryCounts(entries), [entries]);
  const visible = useMemo(() => sortEntries(filterEntries(entriesInView(entries, view, flagged), query, ""), sort), [entries, view, flagged, query, sort]);
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

  // On a wide screen the details pane always shows something; on a phone
  // the sheet shows the login tapped.
  const selected = wide ? (entries.find((entry) => entry.id === selectedId) ?? visible[0] ?? null) : sheetFor ? (entries.find((entry) => entry.id === sheetFor) ?? null) : null;
  // A password on show belongs to the login on show; another hides it.
  if (revealed && revealed.id !== selected?.id) setRevealed(null);

  const n = (value: number) => formatCount(value, fmt);

  function showLogin(id: string) {
    setSelectedId(id);
    if (!wide) {
      setSheetFor(id);
      steps.open("login", id);
    }
  }

  function closeSheet() {
    setSheetFor(null);
    steps.close("login");
  }

  function openCheckup() {
    steps.open("checkup", "1");
  }

  // Leaving it shows the list as it was, with nothing popped open.
  function closeCheckup() {
    setSelectedId(null);
    steps.close("checkup");
  }

  function copyShown(text: string, message: string) {
    void copyText(text).then((copied) => (copied ? toast.success(message) : toast.error(t("Couldn't copy. Select the text and copy it yourself."))));
  }

  function copyUsername(entry: VaultEntrySummary) {
    if (entry.usernameOrEmail) copyShown(entry.usernameOrEmail, t("{title} username copied", { title: entry.title }));
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
  // is something the reader can do.
  function copyPassword(entry: VaultEntrySummary) {
    const known = revealed?.id === entry.id ? revealed.password : null;
    const password = known !== null ? Promise.resolve(known) : fetchPassword(entry);
    void copySecret(password).then(async (outcome) => {
      if (outcome === "copied") {
        toast.success(t("{title} password copied", { title: entry.title }));
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

  // A saved login is shown, except from the checkup, which stays on screen.
  // On a phone the drawer's step turns into the login's sheet where it
  // stands; the drawer's close (next) then has nothing left to take off.
  function saved(entry: VaultEntrySummary) {
    upsert(entry);
    if (checkupOpen) return;
    setSelectedId(entry.id);
    if (!wide) {
      setSheetFor(entry.id);
      steps.swap("entry", "login", entry.id);
    }
  }

  // Close, Cancel, Escape and a save take the drawer's step off the address
  // (the way Back would, as it was put there), then close the drawer.
  function closeDrawer() {
    steps.close("entry");
    onDrawer((current) => current && { ...current, open: false });
  }

  function remove() {
    if (!removing) return;
    const target = removing;
    startRemove(async () => {
      const result = await settle(deleteVaultEntryAction(token, target.id));
      if (result.success) {
        onEntries((list) => list.filter((e) => e.id !== target.id));
        if (selectedId === target.id) setSelectedId(null);
        if (sheetFor === target.id) closeSheet();
        setRemoving(null);
        toast.success(t("Login deleted"));
      } else if (isLockedMessage(result.message)) {
        onLocked();
      } else {
        toast.error(t(result.message ?? "Failed to delete entry"));
      }
    });
  }

  function toggleFavorite(entry: VaultEntrySummary) {
    startSave(async () => {
      const result = await settle(updateVaultEntryAction(token, entry.id, { isFavorite: !entry.isFavorite }));
      if (result.success && result.data) upsert(result.data);
      else if (isLockedMessage(result.message)) onLocked();
      else toast.error(t(result.message ?? "Failed to update vault entry"));
    });
  }

  // "It's fine" updates the login where it is; nothing opens.
  function markFine(entry: VaultEntrySummary) {
    startSave(async () => {
      const result = await settle(dismissVaultCheckupAction(token, entry.id));
      if (result.success && result.data) {
        upsert(result.data);
        toast.success(t("Marked as fine"));
      } else if (isLockedMessage(result.message)) onLocked();
      else toast.error(t(result.message ?? "Failed to update vault entry"));
    });
  }

  const openAdd = (preset: QuickLogin | null = null) => onDrawer({ open: true, draft: draftFor(null, preset, t) });
  const openEdit = (entry: VaultEntrySummary) => onDrawer({ open: true, draft: draftFor(entry, null, t) });

  // Change: the website to set a new password there, and the login to save it.
  function changePassword(entry: VaultEntrySummary) {
    if (entry.websiteUrl) window.open(normalizeUrl(entry.websiteUrl), "_blank", "noopener,noreferrer");
    openEdit(entry);
  }

  // The rows' three handlers, made once. Each calls the latest one through
  // this ref (kept current like onLockRef), so the memoised rows aren't
  // drawn again with the page, which is every keystroke in the drawer.
  const rowActions = useRef({ showLogin, copyUsername, copyPassword });
  useEffect(() => {
    rowActions.current = { showLogin, copyUsername, copyPassword };
  });
  const selectRow = useCallback((id: string) => rowActions.current.showLogin(id), []);
  const copyRowUsername = useCallback((entry: VaultEntrySummary) => rowActions.current.copyUsername(entry), []);
  const copyRowPassword = useCallback((entry: VaultEntrySummary) => rowActions.current.copyPassword(entry), []);

  const viewLabel = (value: VaultView) => (value === "" ? t("All logins") : value === "FAVORITES" ? t("Favorites") : value === "ATTENTION" ? t("Needs attention") : t(VAULT_CATEGORY_LABELS[value]));
  const chipLabel = (value: VaultView) => (value === "" ? t("All") : value === "FAVORITES" ? `★ ${t("Favorites")}` : viewLabel(value));
  const viewCount = (value: VaultView) => (value === "" ? entries.length : value === "FAVORITES" ? favorites : value === "ATTENTION" ? flagged.size : counts[value]);
  // A count is shown once there is one: the list's answer for every view,
  // and the checkup's too for Needs attention.
  const countKnown = (value: VaultView) => !loading && (value !== "ATTENTION" || checkupLoad === "ready");
  const listLabel = viewLabel(view);
  const summary =
    checkup && flagged.size > 0
      ? t(flagged.size === 1 ? "{count} login needs attention: {reused} reused, {weak} weak, {old} old." : "{count} logins need attention: {reused} reused, {weak} weak, {old} old.", { count: n(flagged.size), reused: n(checkup.reused.length), weak: n(checkup.weak.length), old: n(checkup.old.length) })
      : t("Every login looks fine.");
  const total = entries.length;
  const phonePlaceholder = loading ? t("Search logins") : t(total === 1 ? "Search {count} login" : "Search {count} logins", { count: n(total) });
  const widePlaceholder = loading ? t("Search logins") : t(total === 1 ? "Search {count} login by name, username or website" : "Search {count} logins by name, username or website", { count: n(total) });
  const searched = query.trim();

  const subtitle = useMemo(() => <LockCountdown expiresAt={expiresAt} look="bar" />, [expiresAt]);
  const lockButton = useMemo(
    () => (
      <button type="button" onClick={() => onLockRef.current()} aria-label={t("Lock now")} title={t("Lock now")} className="flex size-11 items-center justify-center rounded-md text-ink-2 hover:bg-surface-sunken">
        <Lock className="size-5" aria-hidden="true" />
      </button>
    ),
    [t],
  );

  const detailsFor = (entry: VaultEntrySummary, framed: boolean) => (
    <EntryDetails
      entry={entry}
      issues={issuesOf(checkup, entry.id)}
      revealed={revealed?.id === entry.id ? revealed.password : null}
      busy={revealing === entry.id}
      onToggleReveal={() => toggleReveal(entry)}
      onCopyPassword={() => copyPassword(entry)}
      onCopy={copyShown}
      onFavorite={() => toggleFavorite(entry)}
      onEdit={() => openEdit(entry)}
      onDelete={() => setRemoving(entry)}
      framed={framed}
      onClose={framed ? undefined : closeSheet}
    />
  );

  const showAll = view !== "" && (
    <Button variant="secondary" size="sm" onClick={() => setView("")} className="pointer-coarse:h-11">
      {searched ? t("Search all logins") : t("Show all logins")}
    </Button>
  );
  // Needs attention with no checkup answer on hand says so, never "No
  // logins need attention".
  const noMatch =
    view === "ATTENTION" && checkupLoad === "loading" ? (
      <ListEmpty title={t("Checking your logins…")} />
    ) : view === "ATTENTION" && checkupLoad === "failed" ? (
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
              : view === "ATTENTION"
                ? t("No logins need attention.")
                : t("No logins in {view} yet.", { view: listLabel })
        }
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

  return (
    // Focus lands here after the unlock: a named region a screen reader announces.
    <PageFrame ref={frame} tabIndex={-1} role="region" aria-label={t("Password Manager")} className={cn(empty ? "gap-6" : "gap-4.5", "outline-none")}>
      <TopbarExtras record={showCheckup ? t("Security checkup") : undefined} subtitle={subtitle} action={lockButton} />
      {/* Phones name the page in the top bar, so the heading is for screen readers there. */}
      {/* The checkup (design-v4 VaultHealth) has no header: the top bar names it, a back link leads home. */}
      <h1 className={cn("sr-only", !showCheckup && "md:hidden")}>{t(showCheckup ? "Security checkup" : "Password Manager")}</h1>
      <PageHeader
        className={cn("max-md:hidden", showCheckup && "hidden")}
        title={t("Password Manager")}
        description={t("Logins for your other accounts: Facebook, bank, email and more.")}
        actions={
          <>
            <LockCountdown expiresAt={expiresAt} look="pill" />
            <Button variant="secondary" onClick={onLock}>
              <Lock />
              {t("Lock now")}
            </Button>
            {/* An empty vault adds from its own tiles; a list on its way, not yet. */}
            {canAdd && (
              <Button onClick={() => openAdd()}>
                <Plus strokeWidth={2.25} />
                {t("Add login")}
              </Button>
            )}
          </>
        }
      />

      {failed ? (
        <ErrorState title={t("Couldn't load your logins")} onRetry={onRetry} />
      ) : empty ? (
        <VaultEmpty onPick={openAdd} />
      ) : showCheckup ? (
        <VaultCheckup entries={entries} checkup={checkup} failed={checkupLoad === "failed"} onRetry={retryCheckup} busy={isSaving} onBack={closeCheckup} onChange={changePassword} onFine={markFine} />
      ) : (
        <>
          {/* Phones: one white band under the bar with the search, the sort and the chips. */}
          <div className="-mx-4 -mt-5 flex flex-col gap-3 border-b border-line bg-surface px-4 pt-3 pb-2 md:contents">
            <div className="flex gap-2 md:hidden">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={phonePlaceholder} aria-label={t("Search logins")} leading={<Search />} size="md" frameClassName="h-11.5 flex-1 rounded-lg bg-strip text-body-lg" />
              {/* The select is laid over the icon, so a tap opens the phone's own picker. */}
              <label className="relative flex size-11.5 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink-2 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring">
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
            <div className="flex flex-col gap-3 max-md:hidden sm:flex-row">
              <Input size="md" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={widePlaceholder} aria-label={t("Search logins")} leading={<Search />} frameClassName="flex-1" />
              <NativeSelect size="md" value={sort} onChange={(event) => setSort(event.target.value as VaultSort)} aria-label={t("Sort")} frameClassName="sm:w-52">
                {VAULT_SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t("Sort")}: {t(option.label)}
                  </option>
                ))}
              </NativeSelect>
            </div>

            {/* Toggle buttons, not tabs: they filter the one list below. */}
            <div role="group" aria-label={t("Filter")} className="-mx-4 flex gap-2 overflow-x-auto px-4 xl:hidden">
              {chipViews(counts, view, VAULT_CATEGORIES).map((value) => {
                const on = view === value;
                return (
                  <button
                    key={value || "all"}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setView(toggledView(view, value))}
                    className={cn("flex h-8.5 shrink-0 items-center gap-1.5 rounded-full px-3 text-small font-medium pointer-coarse:h-11", on ? "bg-emerald font-semibold text-on-action" : "border border-line bg-surface text-ink-2")}
                  >
                    {chipLabel(value)}
                    {countKnown(value) && <span className="opacity-70 tabular-nums">{n(viewCount(value))}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {checkup && flagged.size > 0 && (
            <button type="button" onClick={openCheckup} className="flex items-center gap-2 rounded-[10px] border border-warning-line bg-warning-50 px-3 py-2.5 text-left text-small text-warning-ink xl:hidden">
              <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{summary}</span>
              <span className="font-semibold">{t("Security checkup")}</span>
            </button>
          )}

          {/* The side menu joins at 1280px; below that the list keeps the room. */}
          <div className="grid items-start gap-4 max-md:-mx-4 max-md:-mt-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[212px_minmax(0,1fr)_372px]">
            <div className="hidden flex-col gap-0.5 xl:flex">
              <div role="group" aria-label={t("Vault sections")} className="flex flex-col gap-0.5">
                {VIEWS.map((item) => {
                  const on = view === item.value;
                  return (
                    <button key={item.value || "all"} type="button" aria-pressed={on} onClick={() => setView(toggledView(view, item.value))} className={cn("flex h-9.5 items-center gap-3 rounded-md px-3 text-body", on ? "bg-mint-50 font-semibold text-emerald" : "font-medium text-ink-2 hover:bg-surface-sunken")}>
                      <item.icon className={cn("size-4", !on && (item.warn ? "text-warning" : "text-ink-muted"))} aria-hidden="true" />
                      <span className="flex-1 text-left">{t(item.label)}</span>
                      {countKnown(item.value) && <span className={cn("min-w-5.5 rounded-full px-2 text-center text-caption font-semibold tabular-nums", on ? "bg-surface text-emerald" : item.warn ? "bg-warning-soft text-warning" : "bg-surface-sunken text-ink-2")}>{n(viewCount(item.value))}</span>}
                    </button>
                  );
                })}
              </div>
              <span id="vault-categories" className="mx-2.5 mt-3 mb-1.5 text-[11px] leading-normal font-semibold tracking-[0.06em] text-ink-muted uppercase">
                {t("Categories")}
              </span>
              <div role="group" aria-labelledby="vault-categories" className="flex flex-col gap-0.5">
                {VAULT_CATEGORIES.map((value) => {
                  const Icon = VAULT_CATEGORY_ICONS[value];
                  const on = view === value;
                  return (
                    <button key={value} type="button" aria-pressed={on} onClick={() => setView(toggledView(view, value))} className={cn("flex h-9 items-center gap-3 rounded-md px-3 text-body font-medium", on ? "bg-mint-50 text-emerald" : "text-ink-2 hover:bg-surface-sunken")}>
                      <span aria-hidden="true" className={cn("flex size-6 items-center justify-center rounded-sm [&_svg]:size-3.5", SOFT_TONE[VAULT_CATEGORY_TONE[value]])}>
                        <Icon />
                      </span>
                      <span className="flex-1 text-left">{t(VAULT_CATEGORY_LABELS[value])}</span>
                      {!loading && <span className="text-caption text-ink-muted tabular-nums">{n(counts[value])}</span>}
                    </button>
                  );
                })}
              </div>
              {checkup && (
                <button type="button" onClick={openCheckup} className={cn("mt-3 flex flex-col gap-1 rounded-[10px] border p-3 text-left", flagged.size ? "border-warning-line bg-warning-50 text-warning-ink" : "border-emerald-line bg-emerald-soft text-brand-ink")}>
                  <span className="flex items-center gap-1.5 text-small font-bold">
                    {flagged.size ? <ShieldAlert className="size-3.75 text-warning" aria-hidden="true" /> : <ShieldCheck className="size-3.75" aria-hidden="true" />}
                    {t("Security checkup")}
                  </span>
                  <span className="text-[12.5px] leading-[1.45]">{summary}</span>
                </button>
              )}
            </div>

            {loading ? (
              <Card padding="none" className="overflow-hidden max-md:rounded-none max-md:border-0 max-md:shadow-none">
                <SkeletonRows rows={5} />
              </Card>
            ) : (
              <ListCard
                id={LIST_ID}
                label={listLabel}
                className="max-md:rounded-none max-md:border-0 max-md:shadow-none"
                footer={
                  visible.length > STEP ? (
                    <ListFooter>
                      <LoadMore shown={rows.length} total={visible.length} step={STEP} onMore={() => setGrown({ key: filterKey, count: shownCount + STEP })} onLess={shownCount > STEP ? () => setGrown({ key: filterKey, count: STEP }) : undefined} focusTargetId={LIST_ID} />
                    </ListFooter>
                  ) : undefined
                }
              >
                <ListHead columns={COLUMNS}>
                  <ListHeadCell>{countKnown(view) ? `${listLabel} · ${n(visible.length)}` : listLabel}</ListHeadCell>
                  <ListHeadCell align="end">{t("Copy")}</ListHeadCell>
                </ListHead>
                {visible.length === 0
                  ? noMatch
                  : rows.map((entry) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        columns={COLUMNS}
                        selected={selected?.id === entry.id}
                        attention={flagged.has(entry.id)}
                        onSelect={selectRow}
                        onCopyUsername={copyRowUsername}
                        onCopyPassword={copyRowPassword}
                      />
                    ))}
              </ListCard>
            )}

            <div className="hidden lg:block">
              {wide && selected ? (
                detailsFor(selected, true)
              ) : (
                <Card padding="none" className="px-5 py-10 text-center text-small text-ink-muted">
                  {t("Pick a login to see its details.")}
                </Card>
              )}
            </div>
          </div>

          <Sheet open={!wide && selected !== null} onOpenChange={(next) => !next && closeSheet()}>
            <SheetContent side="bottom" showCloseButton={false} aria-describedby={undefined} className="max-h-[88vh] gap-0 overflow-y-auto rounded-t-xl border-0 bg-surface p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>{selected?.title ?? ""}</SheetTitle>
              </SheetHeader>
              {!wide && selected && detailsFor(selected, false)}
            </SheetContent>
          </Sheet>
        </>
      )}

      {canAdd && (
        <button type="button" onClick={() => openAdd()} aria-label={t("Add login")} className="fixed right-4 bottom-6 z-30 flex size-14 items-center justify-center rounded-full bg-forest text-white shadow-float md:hidden dark:bg-emerald dark:text-on-action">
          <Plus className="size-6" strokeWidth={2.25} aria-hidden="true" />
        </button>
      )}

      <EntryDrawer open={drawer?.open ?? false} draft={drawer?.draft ?? null} token={token} onChange={(draft) => onDrawer({ open: true, draft })} onClose={closeDrawer} onSaved={saved} onLocked={onLocked} />
      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        isPending={isRemoving}
        danger
        title={t("Delete this login?")}
        description={removing ? t("{title} will be removed from your vault. This can't be undone.", { title: removing.title }) : ""}
        confirmLabel={t("Delete")}
      />
    </PageFrame>
  );
}
