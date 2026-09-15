"use client";

import { Archive, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { archiveAccountAction } from "@/lib/accountActions";
import type { Account } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { SavingsWalletFormModal } from "./SavingsWalletFormModal";

interface SavingsWalletPageClientProps {
  businessId: string;
  wallets: Account[];
  canManage: boolean;
  currency: string;
}

// Same shape as Balance's own WalletPageClient -- a Savings Wallet is just
// another money-holding Account (accountSubtype "savings"), managed the
// same way (name/account number/opening balance, Add/Edit/Archive). Where
// its balance actually lives day-to-day is /savings-goals/overview (per-
// goal breakdown) and /accounts/[id] (this wallet's own ledger).
export function SavingsWalletPageClient({ businessId, wallets, canManage, currency }: SavingsWalletPageClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Account | null>(null);
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setEditingWallet(null);
    setFormOpen(true);
  }

  function openEdit(wallet: Account) {
    setEditingWallet(wallet);
    setFormOpen(true);
  }

  function handleArchive(wallet: Account) {
    if (!window.confirm(`Archive "${wallet.name}"?`)) return;
    startTransition(async () => {
      const result = await archiveAccountAction(businessId, wallet.id);
      if (result.success) {
        toast.success("Savings Wallet archived");
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to archive Savings Wallet");
      }
    });
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Savings Wallet</h1>
          <p className="mt-1 text-sm text-neutral-500">Where your saved money actually sits -- e.g. a bank DPS/FDR account.</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        {wallets.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">No Savings Wallets yet -- add one to start funding goals.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Account Number</th>
                <th className="px-4 py-3 font-medium text-right">Opening Balance</th>
                {canManage && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {wallets.map((wallet) => (
                <tr key={wallet.id}>
                  <td className="px-4 py-3">
                    <Link href={`/accounts/${wallet.id}`} className="font-medium text-neutral-800 hover:underline">
                      {wallet.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{wallet.accountNumber ?? "--"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-700">{formatCurrency(wallet.openingBalance, currency)}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(wallet)}
                          title="Edit"
                          className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleArchive(wallet)}
                          title="Archive"
                          className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <SavingsWalletFormModal open={formOpen} onClose={() => setFormOpen(false)} businessId={businessId} editingWallet={editingWallet} />
    </div>
  );
}
