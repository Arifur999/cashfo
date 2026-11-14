"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Account } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import {
  addInvestmentEntryAction,
  closeInvestmentAction,
  createInvestmentAction,
  deleteInvestmentAction,
  deleteInvestmentEntryAction,
  reopenInvestmentAction,
  restoreInvestmentAction,
  restoreInvestmentEntryAction,
  undoCloseInvestmentAction,
  undoInvestmentChangeAction,
  updateInvestmentAction,
  updateInvestmentEntryAction,
} from "@/lib/customer/investmentActions";
import { figuresOf, type InvestmentFigures } from "@/lib/customer/investmentDisplay";
import type { CloseInput, EntryEditInput, EntryInput, Investment, InvestmentInput, NewEntryType } from "@/lib/customer/investmentTypes";
import type { ActionResult } from "@/lib/customer/authActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CloseDialog } from "./CloseDialog";
import { DeleteDialog, type DeleteTarget } from "./DeleteDialog";
import { EntryDialog, type EntryOpen } from "./EntryDialog";
import { InvestmentFormDialog } from "./InvestmentFormDialog";

interface InvestmentsContext {
  businessId: string;
  currency: string;
  today: string;
  investments: Investment[];
  figures: InvestmentFigures[];
  byId: Map<string, InvestmentFigures>;
  // Every wallet (archived ones too, for names); `openWallets` are the ones
  // a new entry can use.
  wallets: Account[];
  openWallets: Account[];
  money: (value: number) => string;
  // 'YYYY-MM-DD' as "5 Nov 2026" / "5 Nov".
  day: (value: string, pattern?: string) => string;
  walletName: (id: string | null | undefined) => string;
  openNew: () => void;
  openEdit: (id: string) => void;
  openEntry: (type: NewEntryType, investmentId: string) => void;
  openEditEntry: (investmentId: string, entryId: string) => void;
  openClose: (id: string) => void;
  askDelete: (target: DeleteTarget) => void;
  reopen: (id: string) => void;
  statementHref: (id: string) => string;
}

const Ctx = createContext<InvestmentsContext | null>(null);

// The InvestApp board's toast over the app's pill: a 14px-cornered ink box
// (the same in dark), 14px words, a white Undo on a faint white pill.
const IV_TOAST = {
  toast: "min-h-0! gap-3.5! rounded-[14px]! bg-toast! py-3! pr-3.5! pl-4.5! text-[14px]! font-normal! text-white! shadow-[0_12px_32px_rgba(18,32,29,0.3)]! ring-0!",
  title: "font-normal!",
  actionButton: "font-semibold! text-white!",
};

export function useInvestments(): InvestmentsContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useInvestments outside InvestmentsProvider");
  return ctx;
}

interface ProviderProps {
  businessId: string;
  currency: string;
  today: string;
  investments: Investment[];
  wallets: Account[];
  children: React.ReactNode;
}

// What every Investments page shares: the investments worked out for
// today, the wallets, and the popups (New / Edit investment, an entry,
// Close investment, Delete) with their saves, toasts and undos. A save
// reloads the page's data from the server.
export function InvestmentsProvider({ businessId, currency, today, investments, wallets, children }: ProviderProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [form, setForm] = useState<{ id: string | null } | null>(null);
  const [entry, setEntry] = useState<EntryOpen | null>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const [busy, setBusy] = useState(false);

  const figures = useMemo(() => investments.map((inv) => figuresOf(inv, today)), [investments, today]);
  const byId = useMemo(() => new Map(figures.map((f) => [f.investment.id, f])), [figures]);
  const openWallets = useMemo(() => wallets.filter((w) => w.status !== "ARCHIVED"), [wallets]);

  const money = (value: number) => formatCurrency(value, currency, fmt);
  const day = (value: string, pattern = "d MMM yyyy") => (value ? formatDate(`${value.slice(0, 10)}T00:00:00.000Z`, pattern, fmt) : "");
  const walletName = (id: string | null | undefined) => wallets.find((w) => w.id === id)?.name ?? "";

  // Runs a save: the popup stays open on a refusal, which is toasted.
  async function run<T>(call: () => Promise<ActionResult<T>>, done: (data: T) => void): Promise<boolean> {
    setBusy(true);
    try {
      const result = await call();
      if (!result.success) {
        toast.error(t(result.message ?? "Something went wrong"));
        return false;
      }
      done(result.data as T);
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  // The board's toast: words alone, Undo for six seconds when there is one
  // (pressing it puts things back and the toast goes), else 2.6 seconds.
  const undoable = (message: string, undo?: () => Promise<ActionResult<unknown>>) =>
    toast(message, { icon: null, classNames: IV_TOAST, duration: undo ? 6000 : 2600, ...(undo ? { action: { label: t("Undo"), onClick: () => void run(undo, () => {}) } } : {}) });

  const saveInvestment = async (input: InvestmentInput) => {
    const editing = form?.id ?? null;
    if (editing) {
      return run(() => updateInvestmentAction(businessId, editing, input), (saved) => {
        setForm(null);
        undoable(t("Changes saved"), saved.undoId ? () => undoInvestmentChangeAction(businessId, editing, saved.undoId!) : undefined);
      });
    }
    return run(() => createInvestmentAction(businessId, input), (made) => {
      setForm(null);
      undoable(t("{name} added", { name: made.name }), () => deleteInvestmentAction(businessId, made.id));
      // The statement turns to the new investment.
      if (pathname === "/investments/statement") router.replace(`/investments/statement?id=${encodeURIComponent(made.id)}`);
    });
  };

  const saveEntry = async (investmentId: string, input: EntryInput, entryId: string | null, edit: EntryEditInput) => {
    if (entryId) {
      return run(() => updateInvestmentEntryAction(businessId, investmentId, entryId, edit), (saved) => {
        setEntry(null);
        undoable(t("Entry updated"), saved.undoId ? () => undoInvestmentChangeAction(businessId, investmentId, saved.undoId!) : undefined);
      });
    }
    const name = byId.get(investmentId)?.investment.name ?? "";
    const amount = money(input.amount);
    const message = {
      PROFIT: t("{amount} profit saved", { amount }),
      ADD: t("{amount} added to {name}", { amount, name }),
      BACK: t("{amount} capital back saved", { amount }),
      LOSS: t("Loss saved"),
    }[input.type];
    return run(() => addInvestmentEntryAction(businessId, investmentId, input), (made) => {
      setEntry(null);
      undoable(message, () => deleteInvestmentEntryAction(businessId, investmentId, made.entryId));
    });
  };

  const saveClose = async (id: string, input: CloseInput) => {
    const name = byId.get(id)?.investment.name ?? "";
    return run(() => closeInvestmentAction(businessId, id, input), () => {
      setClosing(null);
      undoable(t("{name} closed", { name }), () => undoCloseInvestmentAction(businessId, id));
    });
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    if (target.kind === "investment") {
      const name = byId.get(target.id)?.investment.name ?? "";
      await run(() => deleteInvestmentAction(businessId, target.id), () => {
        setDeleting(null);
        undoable(t("{name} deleted", { name }), () => restoreInvestmentAction(businessId, target.id));
      });
      return;
    }
    await run(() => deleteInvestmentEntryAction(businessId, target.investmentId, target.entryId), () => {
      setDeleting(null);
      setEntry(null);
      undoable(t("Entry deleted"), () => restoreInvestmentEntryAction(businessId, target.investmentId, target.entryId));
    });
  };

  const reopen = (id: string) =>
    void run(() => reopenInvestmentAction(businessId, id), (saved) => {
      undoable(t("Investment reopened"), saved.undoId ? () => undoInvestmentChangeAction(businessId, id, saved.undoId!) : undefined);
    });

  const value: InvestmentsContext = {
    businessId,
    currency,
    today,
    investments,
    figures,
    byId,
    wallets,
    openWallets,
    money,
    day,
    walletName,
    openNew: () => setForm({ id: null }),
    openEdit: (id) => setForm({ id }),
    openEntry: (type, investmentId) => setEntry({ type, investmentId, entryId: null }),
    openEditEntry: (investmentId, entryId) => {
      const found = byId.get(investmentId)?.investment.entries.find((e) => e.id === entryId);
      if (!found) return;
      if (found.type === "INVEST") setForm({ id: investmentId });
      else setEntry({ type: found.type, investmentId, entryId });
    },
    openClose: (id) => setClosing(id),
    askDelete: (target) => setDeleting(target),
    reopen,
    statementHref: (id) => `/investments/statement?id=${encodeURIComponent(id)}`,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <InvestmentFormDialog open={form} onClose={() => setForm(null)} onSave={saveInvestment} busy={busy} />
      <EntryDialog open={entry} onClose={() => setEntry(null)} onSave={saveEntry} onDelete={(investmentId, entryId) => {
          // As on the board, the entry popup gives way to the confirm.
          setEntry(null);
          setDeleting({ kind: "entry", investmentId, entryId });
        }} busy={busy} />
      <CloseDialog id={closing} onClose={() => setClosing(null)} onSave={saveClose} busy={busy} />
      <DeleteDialog target={deleting} onClose={() => setDeleting(null)} onConfirm={confirmDelete} busy={busy} />
    </Ctx.Provider>
  );
}
