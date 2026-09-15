"use client";

import { Eye, EyeOff, Lock, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { VaultEntryCategory, VaultEntrySummary } from "@/lib/api";
import { deleteVaultEntryAction, listVaultEntriesAction, revealVaultEntryAction } from "@/lib/passwordVaultActions";
import { VAULT_CATEGORY_ICONS, VAULT_CATEGORY_LABELS } from "./vaultCategoryDisplay";
import { VaultEntryModal } from "./VaultEntryModal";
import { VaultUnlockGate } from "./VaultUnlockGate";

const FILTER_PILLS: { value: VaultEntryCategory | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "SOCIAL", label: "Social" },
  { value: "BANK", label: "Bank" },
  { value: "EMAIL", label: "Email" },
  { value: "SHOPPING", label: "Shopping" },
  { value: "WORK", label: "Work" },
  { value: "OTHER", label: "Other" },
];

// A vault session expiring mid-use (10 min, see backend VAULT_TOKEN_EXPIRES_IN)
// or being locked reads the same to the user: back to the unlock gate.
function isLockedMessage(message: string | undefined): boolean {
  return !!message && /unlock|locked/i.test(message);
}

function EntryRow({
  entry,
  vaultToken,
  onLocked,
  onEdit,
  onDeleted,
}: {
  entry: VaultEntrySummary;
  vaultToken: string;
  onLocked: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const Icon = VAULT_CATEGORY_ICONS[entry.category];

  function handleToggleReveal() {
    if (revealed !== null) {
      setRevealed(null);
      return;
    }
    setIsRevealing(true);
    revealVaultEntryAction(vaultToken, entry.id).then((result) => {
      setIsRevealing(false);
      if (result.success && result.data) {
        setRevealed(result.data.password);
      } else if (isLockedMessage(result.message)) {
        onLocked();
      } else {
        toast.error(result.message ?? "Failed to reveal password");
      }
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteVaultEntryAction(vaultToken, entry.id);
      if (result.success) {
        toast.success("Entry deleted");
        setDeleteOpen(false);
        onDeleted();
      } else if (isLockedMessage(result.message)) {
        onLocked();
      } else {
        toast.error(result.message ?? "Failed to delete entry");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900">{entry.title}</p>
          <p className="truncate text-xs text-neutral-400">{entry.usernameOrEmail || VAULT_CATEGORY_LABELS[entry.category]}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden w-36 truncate font-mono text-sm text-neutral-600 sm:inline">
          {isRevealing ? "..." : revealed !== null ? revealed : "••••••••"}
        </span>
        <button
          type="button"
          onClick={handleToggleReveal}
          disabled={isRevealing}
          aria-label={revealed !== null ? "Hide password" : "Show password"}
          className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"
        >
          {revealed !== null ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button type="button" onClick={onEdit} aria-label="Edit" className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600">
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          aria-label="Delete"
          className="rounded-lg p-1.5 text-neutral-400 hover:bg-brand-danger/10 hover:text-brand-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete this entry?"
        message={`"${entry.title}" will be permanently removed from your vault.`}
        confirmLabel="Delete"
        isPending={isDeleting}
      />
    </div>
  );
}

export function PasswordVaultPageClient() {
  const [vaultToken, setVaultToken] = useState<string | null>(null);
  const [entries, setEntries] = useState<VaultEntrySummary[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [activeCategory, setActiveCategory] = useState<VaultEntryCategory | "">("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VaultEntrySummary | null>(null);

  function lock() {
    setVaultToken(null);
    setEntries([]);
  }

  function fetchEntries(token: string) {
    setLoadingEntries(true);
    listVaultEntriesAction(token).then((result) => {
      setLoadingEntries(false);
      if (result.success && result.data) {
        setEntries(result.data);
      } else if (isLockedMessage(result.message)) {
        lock();
      } else {
        toast.error(result.message ?? "Failed to load vault entries");
      }
    });
  }

  function handleUnlocked(token: string) {
    setVaultToken(token);
    fetchEntries(token);
  }

  function openCreate() {
    setEditingEntry(null);
    setFormOpen(true);
  }

  function openEdit(entry: VaultEntrySummary) {
    setEditingEntry(entry);
    setFormOpen(true);
  }

  const visibleEntries = activeCategory ? entries.filter((e) => e.category === activeCategory) : entries;

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Password Manager</h1>
          <p className="mt-1 text-sm text-neutral-500">Securely store logins for your other accounts -- Facebook, bank, email and more</p>
        </div>
        {vaultToken && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Add Entry
            </button>
            <button
              type="button"
              onClick={lock}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
            >
              <Lock className="h-4 w-4" />
              Lock
            </button>
          </div>
        )}
      </div>

      {!vaultToken ? (
        <VaultUnlockGate onUnlocked={handleUnlocked} />
      ) : (
        <div className="mt-6">
          <div className="flex flex-wrap gap-2">
            {FILTER_PILLS.map((pill) => (
              <button
                key={pill.value}
                type="button"
                onClick={() => setActiveCategory(pill.value)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === pill.value ? "bg-brand-primary text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-2xl bg-surface shadow-sm shadow-black/5">
            {loadingEntries ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
              </div>
            ) : visibleEntries.length === 0 ? (
              <p className="py-10 text-center text-sm text-neutral-400">
                {entries.length === 0 ? "No entries saved yet -- click “Add Entry” to get started." : "No entries in this category."}
              </p>
            ) : (
              <div className="divide-y divide-neutral-50">
                {visibleEntries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    vaultToken={vaultToken}
                    onLocked={lock}
                    onEdit={() => openEdit(entry)}
                    onDeleted={() => fetchEntries(vaultToken)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {vaultToken && (
        <VaultEntryModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          vaultToken={vaultToken}
          editingEntry={editingEntry}
          onSaved={() => fetchEntries(vaultToken)}
        />
      )}
    </div>
  );
}
