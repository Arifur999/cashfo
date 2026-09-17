"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Account, EntryType, TransactionType } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { createTransactionAction } from "@/lib/transactionActions";

const TRANSACTION_TYPES: TransactionType[] = ["JOURNAL", "INCOME", "EXPENSE", "TRANSFER", "SALE", "PURCHASE", "PAYMENT"];

interface EntryRow {
  accountId: string;
  entryType: EntryType;
  amount: string;
}

function emptyRow(entryType: EntryType): EntryRow {
  return { accountId: "", entryType, amount: "" };
}

interface JournalEntryFormProps {
  businessId: string;
  accounts: Account[];
}

export function JournalEntryForm({ businessId, accounts }: JournalEntryFormProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [transactionType, setTransactionType] = useState<TransactionType>("JOURNAL");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<EntryRow[]>([emptyRow("DEBIT"), emptyRow("CREDIT")]);
  const [isPending, startTransition] = useTransition();

  function addRow() {
    setRows((prev) => [...prev, emptyRow("DEBIT")]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, patch: Partial<EntryRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  const debitTotal = rows.filter((r) => r.entryType === "DEBIT").reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const creditTotal = rows.filter((r) => r.entryType === "CREDIT").reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const difference = Math.round((debitTotal - creditTotal) * 100) / 100;
  const isBalanced = difference === 0 && debitTotal > 0;
  const allRowsFilled = rows.length >= 2 && rows.every((r) => r.accountId && Number(r.amount) > 0);
  const canSubmit = isBalanced && allRowsFilled;

  function handleSubmit() {
    startTransition(async () => {
      const result = await createTransactionAction(businessId, {
        transactionType,
        transactionDate,
        description: description || undefined,
        entries: rows.map((r) => ({ accountId: r.accountId, entryType: r.entryType, amount: Number(r.amount) })),
      });
      if (result.success && result.data) {
        toast.success(t("Transaction posted"));
        router.push(`/transactions/${result.data.id}`);
      } else {
        toast.error(result.message ?? t("Failed to create transaction"));
      }
    });
  }

  return (
    <div className="space-y-5 rounded-2xl bg-surface p-6 shadow-sm shadow-black/5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Transaction Type")}</label>
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value as TransactionType)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
          >
            {TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Date")}</label>
          <input
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Description")}</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("What is this for?")}
          className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-700">{t("Entries")}</p>
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <select
              value={row.accountId}
              onChange={(e) => updateRow(index, { accountId: e.target.value })}
              className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
            >
              <option value="">{t("Select account...")}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.accountType})
                </option>
              ))}
            </select>
            <select
              value={row.entryType}
              onChange={(e) => updateRow(index, { entryType: e.target.value as EntryType })}
              className="w-28 rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
            >
              <option value="DEBIT">{t("Debit")}</option>
              <option value="CREDIT">{t("Credit")}</option>
            </select>
            <input
              type="number"
              step="0.01"
              value={row.amount}
              onChange={(e) => updateRow(index, { amount: e.target.value })}
              placeholder="0.00"
              className="w-32 rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
            />
            <button
              type="button"
              onClick={() => removeRow(index)}
              disabled={rows.length <= 2}
              title={t("Remove line")}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-brand-primary hover:bg-brand-primary/10"
        >
          <Plus className="h-3.5 w-3.5" /> {t("Add Line")}
        </button>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 text-sm">
        <span>
          {t("Debits:")} <span className="font-medium tabular-nums">{debitTotal.toFixed(2)}</span> · {t("Credits:")}{" "}
          <span className="font-medium tabular-nums">{creditTotal.toFixed(2)}</span>
        </span>
        {isBalanced ? (
          <span className="font-medium text-brand-primary">{t("Balanced")}</span>
        ) : (
          <span className="font-medium text-brand-danger">
            {t("Out of balance by")} {Math.abs(difference).toFixed(2)}
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={!canSubmit || isPending}
        onClick={handleSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("Post Transaction")}
      </button>
    </div>
  );
}
