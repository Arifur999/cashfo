"use client";

import { Lock, Plus, Search } from "lucide-react";
import { useState, useTransition } from "react";
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
import type { VaultEntryCategory, VaultEntrySummary } from "@/lib/customer/api";
import { deleteVaultEntryAction, revealVaultEntryAction } from "@/lib/customer/passwordVaultActions";
import { categoryCounts, countdownText, filterEntries, sortEntries, VAULT_SORTS, type QuickLogin, type VaultSort } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { EntryDetails } from "./EntryDetails";
import { EntryDrawer } from "./EntryDrawer";
import { EntryRow } from "./EntryRow";
import { VAULT_CATEGORIES, VAULT_CATEGORY_ICONS, VAULT_CATEGORY_LABELS, VAULT_CATEGORY_TONE } from "./vaultCategoryDisplay";
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

// The vault, open: search, the list with one-tap copy, and the picked
// login's details beside it (below it, as a sheet, on a phone).
export function VaultHome({ token, entries, loading, msLeft, onEntries, onLock, onLocked }: VaultHomeProps) {
  const { t } = useLocale();
  const wide = useMediaQuery("(min-width: 1024px)");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<VaultSort>("az");
  const [category, setCategory] = useState<VaultEntryCategory | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ open: boolean; editing: VaultEntrySummary | null; preset: QuickLogin | null }>({ open: false, editing: null, preset: null });
  const [removing, setRemoving] = useState<VaultEntrySummary | null>(null);
  const [isRemoving, startRemove] = useTransition();

  const visible = sortEntries(filterEntries(entries, query, category), sort);
  const counts = categoryCounts(entries);
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

  const openAdd = (preset: QuickLogin | null = null) => setDrawer({ open: true, editing: null, preset });
  const listLabel = category === "" ? t("All logins") : t(VAULT_CATEGORY_LABELS[category]);

  const details = selected && (
    <EntryDetails
      entry={selected}
      token={token}
      onLocked={onLocked}
      onCopy={copy}
      onEdit={() => setDrawer({ open: true, editing: selected, preset: null })}
      onDelete={() => setRemoving(selected)}
    />
  );

  return (
    <PageFrame className="gap-4">
      <PageHeader
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
            <Button onClick={() => openAdd()}>
              <Plus strokeWidth={2.25} />
              {t("Add login")}
            </Button>
          </>
        }
      />

      {entries.length === 0 && !loading ? (
        <VaultEmpty onPick={openAdd} />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
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
            {(["", ...VAULT_CATEGORIES] as const).map((value) => {
              const on = category === value;
              const count = value === "" ? entries.length : counts[value];
              return (
                <button key={value || "all"} type="button" role="tab" aria-selected={on} onClick={() => setCategory(value)} className={cn("flex h-8.5 shrink-0 items-center gap-1.5 rounded-full px-3 text-small font-medium", on ? "bg-emerald font-semibold text-white" : "border border-line bg-surface text-ink-2")}>
                  {value === "" ? t("All") : t(VAULT_CATEGORY_LABELS[value])} <span className="opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-[212px_minmax(0,1fr)_372px]">
            <nav aria-label={t("Vault sections")} className="hidden flex-col gap-0.5 lg:flex">
              <button type="button" aria-current={category === "" ? "page" : undefined} onClick={() => setCategory("")} className={cn("flex h-9.5 items-center gap-3 rounded-md px-3 text-body", category === "" ? "bg-mint-50 font-semibold text-emerald" : "font-medium text-ink-2 hover:bg-cream")}>
                <Lock className="size-4" aria-hidden="true" />
                <span className="flex-1 text-left">{t("All logins")}</span>
                <span className={cn("min-w-5.5 rounded-full px-2 text-center text-caption font-semibold", category === "" ? "bg-surface text-emerald" : "bg-surface-sunken text-ink-2")}>{entries.length}</span>
              </button>
              <span className="mx-3 mt-3 mb-2 text-caption font-semibold text-ink-muted">{t("Categories")}</span>
              {VAULT_CATEGORIES.map((value) => {
                const Icon = VAULT_CATEGORY_ICONS[value];
                const on = category === value;
                return (
                  <button key={value} type="button" aria-current={on ? "page" : undefined} onClick={() => setCategory(on ? "" : value)} className={cn("flex h-9 items-center gap-3 rounded-md px-3 text-body font-medium", on ? "bg-mint-50 text-emerald" : "text-ink-2 hover:bg-cream")}>
                    <span className={cn("flex size-6 items-center justify-center rounded-sm [&_svg]:size-3.5", SOFT_TONE[VAULT_CATEGORY_TONE[value]])}>
                      <Icon aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-left">{t(VAULT_CATEGORY_LABELS[value])}</span>
                    <span className="text-caption text-ink-muted tabular-nums">{counts[value]}</span>
                  </button>
                );
              })}
            </nav>

            <Card padding="none" className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line bg-cream px-4 py-3 text-caption font-medium text-ink-muted">
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
                visible.map((entry) => <EntryRow key={entry.id} entry={entry} selected={selected?.id === entry.id} onSelect={() => setSelectedId(entry.id)} onCopyUsername={() => entry.usernameOrEmail && copy(entry.usernameOrEmail, `${entry.title} ${t("username copied")}`)} onCopyPassword={() => copyPassword(entry)} />)
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

      <EntryDrawer open={drawer.open} editing={drawer.editing} preset={drawer.preset} token={token} onClose={() => setDrawer({ open: false, editing: null, preset: null })} onSaved={saved} onLocked={onLocked} />
      <ConfirmDialog open={removing !== null} onClose={() => setRemoving(null)} onConfirm={remove} isPending={isRemoving} danger title={t("Delete this login?")} description={removing ? `${removing.title} ${t("will be removed from your vault. This can't be undone.")}` : ""} confirmLabel={t("Delete")} />
    </PageFrame>
  );
}
