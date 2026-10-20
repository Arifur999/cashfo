"use client";

import { Lock, Menu, Plus, Search, ShieldAlert, ShieldCheck, Star, TriangleAlert } from "lucide-react";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import { useEffect, useEffectEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { SOFT_TONE } from "@/components/smartly/tones";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { VaultCheckup as Checkup, VaultEntryCategory, VaultEntrySummary } from "@/lib/customer/api";
import { deleteVaultEntryAction, dismissVaultCheckupAction, getVaultCheckupAction, revealVaultEntryAction, updateVaultEntryAction } from "@/lib/customer/passwordVaultActions";
import { attentionIds, categoryCounts, countdownText, filterEntries, issuesOf, normalizeUrl, sortEntries, VAULT_SORTS, type QuickLogin, type VaultSort } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { EntryDetails } from "./EntryDetails";
import { EntryDrawer } from "./EntryDrawer";
import { EntryRow } from "./EntryRow";
import { VAULT_CATEGORIES, VAULT_CATEGORY_ICONS, VAULT_CATEGORY_LABELS, VAULT_CATEGORY_TONE } from "./vaultCategoryDisplay";
import { VaultCheckup } from "./VaultCheckup";
import { VaultEmpty } from "./VaultEmpty";
import { isLockedMessage } from "./VaultPageClient";

interface VaultHomeProps {
  token: string;
  entries: VaultEntrySummary[];
  loading: boolean;
  msLeft: number;
  onEntries: (entries: VaultEntrySummary[]) => void;
  onLock: () => void;
  // The API answered that the session is over.
  onLocked: () => void;
}

// What the list shows: every login, the starred ones, the ones the
// checkup flags, or one category.
type VaultView = "" | "FAVORITES" | "ATTENTION" | VaultEntryCategory;

// The vault, open: search, the list with one-tap copy, and the picked
// login's details beside it (below it, as a sheet, on a phone); and the
// security checkup.
export function VaultHome({ token, entries, loading, msLeft, onEntries, onLock, onLocked }: VaultHomeProps) {
  const { t } = useLocale();
  const wide = useMediaQuery("(min-width: 1024px)");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<VaultSort>("az");
  const [view, setView] = useState<VaultView>("");
  const [checkup, setCheckup] = useState<Checkup | null>(null);
  const [checkupOpen, setCheckupOpen] = useState(false);
  const [isSaving, startSave] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ open: boolean; editing: VaultEntrySummary | null; preset: QuickLogin | null }>({ open: false, editing: null, preset: null });
  const [removing, setRemoving] = useState<VaultEntrySummary | null>(null);
  const [isRemoving, startRemove] = useTransition();

  // The checkup runs on the server whenever the logins change; it answers ids.
  const checkupLocked = useEffectEvent(() => onLocked());
  useEffect(() => {
    if (entries.length === 0) return;
    let live = true;
    getVaultCheckupAction(token).then((result) => {
      if (!live) return;
      if (result.success && result.data) setCheckup(result.data);
      else if (isLockedMessage(result.message)) checkupLocked();
    });
    return () => {
      live = false;
    };
  }, [token, entries]);

  const empty = entries.length === 0 && !loading;
  const flagged = attentionIds(checkup);
  const inView = entries.filter((entry) => (view === "" ? true : view === "FAVORITES" ? entry.isFavorite : view === "ATTENTION" ? flagged.has(entry.id) : entry.category === view));
  const visible = sortEntries(filterEntries(inView, query, ""), sort);
  const counts = categoryCounts(entries);
  const favorites = entries.filter((entry) => entry.isFavorite).length;
  const picked = entries.find((entry) => entry.id === selectedId) ?? null;
  // On a wide screen the details pane always shows something.
  const selected = picked ?? (wide ? (visible[0] ?? null) : null);

  async function copy(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error(t("Couldn't copy. Select the text and copy it yourself."));
    }
  }

  async function copyPassword(entry: VaultEntrySummary) {
    const result = await revealVaultEntryAction(token, entry.id);
    if (result.success && result.data) await copy(result.data.password, `${entry.title} ${t("password copied")}`);
    else if (isLockedMessage(result.message)) onLocked();
    else toast.error(result.message ?? t("Failed to reveal password"));
  }

  function saved(entry: VaultEntrySummary) {
    onEntries(entries.some((e) => e.id === entry.id) ? entries.map((e) => (e.id === entry.id ? entry : e)) : [...entries, entry]);
    setSelectedId(entry.id);
  }

  function remove() {
    if (!removing) return;
    const target = removing;
    startRemove(async () => {
      const result = await deleteVaultEntryAction(token, target.id);
      if (result.success) {
        onEntries(entries.filter((e) => e.id !== target.id));
        if (selectedId === target.id) setSelectedId(null);
        setRemoving(null);
        toast.success(t("Login deleted"));
      } else if (isLockedMessage(result.message)) {
        onLocked();
      } else {
        toast.error(result.message ?? t("Failed to delete entry"));
      }
    });
  }

  function toggleFavorite(entry: VaultEntrySummary) {
    startSave(async () => {
      const result = await updateVaultEntryAction(token, entry.id, { isFavorite: !entry.isFavorite });
      if (result.success && result.data) saved(result.data);
      else if (isLockedMessage(result.message)) onLocked();
      else toast.error(result.message ?? t("Failed to update vault entry"));
    });
  }

  function markFine(entry: VaultEntrySummary) {
    startSave(async () => {
      const result = await dismissVaultCheckupAction(token, entry.id);
      if (result.success && result.data) {
        saved(result.data);
        toast.success(t("Marked as fine"));
      } else if (isLockedMessage(result.message)) onLocked();
      else toast.error(result.message ?? t("Failed to update vault entry"));
    });
  }

  // Change: the website to set a new password there, and the login to save it.
  function changePassword(entry: VaultEntrySummary) {
    if (entry.websiteUrl) window.open(normalizeUrl(entry.websiteUrl), "_blank", "noopener,noreferrer");
    setDrawer({ open: true, editing: entry, preset: null });
  }

  const openAdd = (preset: QuickLogin | null = null) => setDrawer({ open: true, editing: null, preset });
  const listLabel = view === "" ? t("All logins") : view === "FAVORITES" ? t("Favorites") : view === "ATTENTION" ? t("Needs attention") : t(VAULT_CATEGORY_LABELS[view]);
  const summary = checkup && flagged.size > 0 ? t("{count} logins need attention: {reused} reused, {weak} weak, {old} old.", { count: flagged.size, reused: checkup.reused.length, weak: checkup.weak.length, old: checkup.old.length }) : t("Every login looks fine.");
  const VIEWS: { value: VaultView; label: string; icon: typeof Menu; count: number; warn?: boolean }[] = [
    { value: "", label: "All logins", icon: Menu, count: entries.length },
    { value: "FAVORITES", label: "Favorites", icon: Star, count: favorites },
    { value: "ATTENTION", label: "Needs attention", icon: TriangleAlert, count: flagged.size, warn: true },
  ];

  const details = selected && (
    <EntryDetails
      entry={selected}
      token={token}
      issues={issuesOf(checkup, selected.id)}
      onLocked={onLocked}
      onCopy={copy}
      onFavorite={() => toggleFavorite(selected)}
      onEdit={() => setDrawer({ open: true, editing: selected, preset: null })}
      onDelete={() => setRemoving(selected)}
    />
  );

  return (
    <PageFrame className={empty ? "gap-6" : "gap-4"}>
      <TopbarExtras
        record={checkupOpen ? t("Security checkup") : undefined}
        subtitle={
          <span role="timer" aria-label={`${t("Vault locks in")} ${countdownText(msLeft)}`} className="flex items-center gap-1 text-caption font-normal text-emerald tabular-nums">
            <span className="size-1.75 rounded-full bg-emerald" aria-hidden="true" />
            {t("Unlocked")} · {t("locks in")} {countdownText(msLeft)}
          </span>
        }
        action={
          <button type="button" onClick={onLock} aria-label={t("Lock now")} title={t("Lock now")} className="flex h-11 w-10 items-center justify-center rounded-md text-ink-2">
            <Lock className="size-5" aria-hidden="true" />
          </button>
        }
      />
      <PageHeader
        className="max-md:hidden"
        eyebrow={t("Security")}
        tone="vault"
        title={t("Password vault")}
        description={t("Logins for your other accounts: Facebook, bank, email and more.")}
        actions={
          <>
            <span role="timer" aria-label={`${t("Vault locks in")} ${countdownText(msLeft)}`} className="flex h-9.5 items-center gap-2 rounded-full border border-mint-200 bg-mint-50 px-3 text-small font-semibold text-forest tabular-nums">
              <span className="size-2 rounded-full bg-emerald" aria-hidden="true" />
              {t("Unlocked")} · {t("locks in")} {countdownText(msLeft)}
            </span>
            <Button variant="secondary" onClick={onLock}>
              <Lock />
              {t("Lock now")}
            </Button>
            {/* An empty vault adds from its own tiles. */}
            {!empty && (
              <Button onClick={() => openAdd()}>
                <Plus strokeWidth={2.25} />
                {t("Add login")}
              </Button>
            )}
          </>
        }
      />

      {checkupOpen && checkup ? (
        <VaultCheckup entries={entries} checkup={checkup} busy={isSaving} onBack={() => setCheckupOpen(false)} onChange={changePassword} onFine={markFine} />
      ) : empty ? (
        <VaultEmpty onPick={openAdd} />
      ) : (
        <>
          {/* Phones: one white band under the bar with the search and the chips. */}
          <div className="-mx-4 -mt-5 flex flex-col gap-3 border-b border-line bg-surface px-4 pt-3 pb-2 md:contents">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`${t("Search")} ${entries.length} ${t(entries.length === 1 ? "login" : "logins")}`}
              aria-label={t("Search logins")}
              leading={<Search />}
              size="md"
              frameClassName="h-11.5 rounded-lg bg-strip text-body-lg md:hidden"
            />
            <div className="flex flex-col gap-3 max-md:hidden sm:flex-row">
              <Input size="md" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`${t("Search")} ${entries.length} ${t(entries.length === 1 ? "login by name, username or website" : "logins by name, username or website")}`} aria-label={t("Search logins")} leading={<Search />} frameClassName="flex-1" />
              <NativeSelect size="md" value={sort} onChange={(event) => setSort(event.target.value as VaultSort)} aria-label={t("Sort")} frameClassName="sm:w-52">
                {VAULT_SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t("Sort")}: {t(option.label)}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div role="tablist" aria-label={t("Filter")} className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
              {(["", "FAVORITES", "ATTENTION", ...VAULT_CATEGORIES] as const).map((value) => {
                const on = view === value;
                const count = value === "" ? entries.length : value === "FAVORITES" ? favorites : value === "ATTENTION" ? flagged.size : counts[value];
                return (
                  <button key={value || "all"} type="button" role="tab" aria-selected={on} onClick={() => setView(value)} className={cn("flex h-8.5 shrink-0 items-center gap-1.5 rounded-full px-3 text-small font-medium", on ? "bg-emerald font-semibold text-white" : "border border-line bg-surface text-ink-2")}>
                    {value === "" ? t("All") : value === "FAVORITES" ? `★ ${t("Favorites")}` : value === "ATTENTION" ? t("Needs attention") : t(VAULT_CATEGORY_LABELS[value])} <span className="opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {checkup && flagged.size > 0 && (
            <button type="button" onClick={() => setCheckupOpen(true)} className="flex items-center gap-2 rounded-md border border-warning-fill/40 bg-warning-soft px-3 py-2.5 text-left text-small text-warning lg:hidden">
              <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{summary}</span>
              <span className="font-semibold">{t("Security checkup")}</span>
            </button>
          )}

          <div className="grid items-start gap-4 max-md:-mx-4 max-md:-mt-4 lg:grid-cols-[212px_minmax(0,1fr)_372px]">
            <nav aria-label={t("Vault sections")} className="hidden flex-col gap-0.5 lg:flex">
              {VIEWS.map((item) => {
                const on = view === item.value;
                return (
                  <button key={item.value || "all"} type="button" aria-current={on ? "page" : undefined} onClick={() => setView(item.value)} className={cn("flex h-9.5 items-center gap-3 rounded-md px-3 text-body", on ? "bg-mint-50 font-semibold text-emerald" : "font-medium text-ink-2 hover:bg-cream")}>
                    <item.icon className={cn("size-4", !on && (item.warn ? "text-warning" : "text-ink-muted"))} aria-hidden="true" />
                    <span className="flex-1 text-left">{t(item.label)}</span>
                    <span className={cn("min-w-5.5 rounded-full px-2 text-center text-caption font-semibold", on ? "bg-surface text-emerald" : item.warn ? "bg-warning-soft text-warning" : "bg-surface-sunken text-ink-2")}>{item.count}</span>
                  </button>
                );
              })}
              <span className="mx-3 mt-3 mb-2 text-caption font-semibold text-ink-muted">{t("Categories")}</span>
              {VAULT_CATEGORIES.map((value) => {
                const Icon = VAULT_CATEGORY_ICONS[value];
                const on = view === value;
                return (
                  <button key={value} type="button" aria-current={on ? "page" : undefined} onClick={() => setView(on ? "" : value)} className={cn("flex h-9 items-center gap-3 rounded-md px-3 text-body font-medium", on ? "bg-mint-50 text-emerald" : "text-ink-2 hover:bg-cream")}>
                    <span className={cn("flex size-6 items-center justify-center rounded-sm [&_svg]:size-3.5", SOFT_TONE[VAULT_CATEGORY_TONE[value]])}>
                      <Icon aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-left">{t(VAULT_CATEGORY_LABELS[value])}</span>
                    <span className="text-caption text-ink-muted tabular-nums">{counts[value]}</span>
                  </button>
                );
              })}
              {checkup && (
                <button type="button" onClick={() => setCheckupOpen(true)} className={cn("mt-3 flex flex-col gap-1 rounded-md border p-3 text-left", flagged.size ? "border-warning-fill/40 bg-warning-soft text-warning" : "border-mint-200 bg-mint-50 text-emerald")}>
                  <span className="flex items-center gap-2 text-small font-bold">
                    {flagged.size ? <ShieldAlert className="size-4" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}
                    {t("Security checkup")}
                  </span>
                  <span className="text-small leading-[1.45]">{summary}</span>
                </button>
              )}
            </nav>

            <Card padding="none" className="overflow-hidden max-md:rounded-none max-md:border-0 max-md:shadow-none">
              <div className="flex items-center justify-between border-b border-line bg-table-head px-4 py-3 text-caption font-medium text-ink-muted max-md:hidden">
                <span>
                  {listLabel} · {visible.length}
                </span>
                <span>{t("Copy")}</span>
              </div>
              {loading && entries.length === 0 ? (
                <span className="block px-4 py-6 text-small text-ink-muted">{t("Loading...")}</span>
              ) : visible.length === 0 ? (
                <span className="block px-4 py-6 text-small text-ink-muted">{t("No logins match.")}</span>
              ) : (
                visible.map((entry) => <EntryRow key={entry.id} entry={entry} selected={selected?.id === entry.id} attention={flagged.has(entry.id)} onSelect={() => setSelectedId(entry.id)} onCopyUsername={() => entry.usernameOrEmail && copy(entry.usernameOrEmail, `${entry.title} ${t("username copied")}`)} onCopyPassword={() => copyPassword(entry)} />)
              )}
            </Card>

            <div className="hidden lg:block">
              {details ?? (
                <Card padding="none" className="px-5 py-10 text-center text-small text-ink-muted">
                  {t("Pick a login to see its details.")}
                </Card>
              )}
            </div>
          </div>

          <Sheet open={!wide && picked !== null} onOpenChange={(next) => !next && setSelectedId(null)}>
            <SheetContent side="bottom" showCloseButton={false} className="max-h-[88vh] gap-0 overflow-y-auto rounded-t-xl border-0 bg-surface p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>{picked?.title ?? ""}</SheetTitle>
              </SheetHeader>
              <span aria-hidden="true" className="mt-2 block h-1 w-10 shrink-0 self-center rounded-full bg-line-strong" />
              {!wide && details}
            </SheetContent>
          </Sheet>
        </>
      )}

      {entries.length > 0 && (
        <button type="button" onClick={() => openAdd()} aria-label={t("Add login")} className="fixed right-4 bottom-6 z-30 flex size-14.5 items-center justify-center rounded-xl bg-emerald text-on-action shadow-[0_10px_24px_rgba(14,26,22,0.25)] md:hidden">
          <Plus className="size-6" strokeWidth={2.25} aria-hidden="true" />
        </button>
      )}

      <EntryDrawer open={drawer.open} editing={drawer.editing} preset={drawer.preset} token={token} onClose={() => setDrawer({ open: false, editing: null, preset: null })} onSaved={saved} onLocked={onLocked} />
      <ConfirmDialog open={removing !== null} onClose={() => setRemoving(null)} onConfirm={remove} isPending={isRemoving} danger title={t("Delete this login?")} description={removing ? `${removing.title} ${t("will be removed from your vault. This can't be undone.")}` : ""} confirmLabel={t("Delete")} />
    </PageFrame>
  );
}
