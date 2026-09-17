"use client";

import { Archive, ChevronDown, ChevronRight, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { archiveAccountAction } from "@/lib/accountActions";
import type { Account, AccountGroup, LanguagePreference } from "@/lib/api";
import { ACCOUNT_TYPE_LABELS, accountDisplayName } from "@/lib/accountDisplay";
import { formatCurrency } from "@/lib/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { AccountFormModal } from "./AccountFormModal";

interface AccountsPageClientProps {
  businessId: string;
  initialGroups: AccountGroup[];
  canManage: boolean;
  preferredLanguage: LanguagePreference;
  currency: string;
}

function flatten(groups: AccountGroup[]): Account[] {
  const result: Account[] = [];
  function walk(accounts: Account[]) {
    for (const a of accounts) {
      result.push(a);
      if (a.children.length > 0) walk(a.children);
    }
  }
  for (const g of groups) walk(g.accounts);
  return result;
}

export function AccountsPageClient({ businessId, initialGroups, canManage, preferredLanguage, currency }: AccountsPageClientProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(initialGroups.map((g) => g.accountType)));
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isPending, startTransition] = useTransition();

  const allAccounts = flatten(initialGroups);

  function toggleSection(accountType: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(accountType)) next.delete(accountType);
      else next.add(accountType);
      return next;
    });
  }

  function openCreate() {
    setEditingAccount(null);
    setFormOpen(true);
  }

  function openEdit(account: Account) {
    setEditingAccount(account);
    setFormOpen(true);
  }

  function handleArchive(account: Account) {
    if (!window.confirm(`${t("Archive")} "${accountDisplayName(account, preferredLanguage)}"?`)) return;
    startTransition(async () => {
      const result = await archiveAccountAction(businessId, account.id);
      if (result.success) {
        toast.success(t("Account archived"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to archive account"));
      }
    });
  }

  function renderAccount(account: Account, depth: number) {
    const isArchived = account.status === "ARCHIVED";
    return (
      <div key={account.id}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => router.push(`/accounts/${account.id}`)}
          onKeyDown={(e) => e.key === "Enter" && router.push(`/accounts/${account.id}`)}
          className="flex cursor-pointer items-center justify-between border-b border-neutral-50 py-2.5 last:border-0 hover:bg-neutral-50/60"
          style={{ paddingLeft: `${depth * 1.5}rem` }}
        >
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isArchived ? "text-neutral-400 line-through" : "text-neutral-800"}`}>
              {accountDisplayName(account, preferredLanguage)}
            </span>
            {account.isSystemAccount && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                {t("Default")}
              </span>
            )}
            {isArchived && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                {t("Archived")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium tabular-nums text-neutral-700">{formatCurrency(account.currentBalance, currency)}</span>
            {canManage && !isArchived && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(account);
                  }}
                  title={t("Edit")}
                  className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchive(account);
                  }}
                  title={t("Archive")}
                  className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
                >
                  <Archive className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
        {account.children.map((child) => renderAccount(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("Chart of Accounts")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("All accounts for this workspace, grouped by type.")}</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" /> {t("Add Account")}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {initialGroups.map((group) => {
          const isOpen = openSections.has(group.accountType);
          return (
            <div key={group.accountType} className="rounded-2xl bg-surface shadow-sm shadow-black/5">
              <button
                type="button"
                onClick={() => toggleSection(group.accountType)}
                className="flex w-full items-center justify-between px-4 py-3"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {t(ACCOUNT_TYPE_LABELS[group.accountType])}
                </span>
                <span className="text-xs text-neutral-400">
                  {group.accounts.length} {t("account(s)")}
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-neutral-50 px-4 pb-2">
                  {group.accounts.length === 0 ? (
                    <p className="py-4 text-sm text-neutral-400">{t("No accounts yet.")}</p>
                  ) : (
                    group.accounts.map((a) => renderAccount(a, 0))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AccountFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        businessId={businessId}
        editingAccount={editingAccount}
        allAccounts={allAccounts}
        preferredLanguage={preferredLanguage}
      />
    </div>
  );
}
