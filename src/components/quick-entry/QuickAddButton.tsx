"use client";

import { ArrowLeftRight, ArrowDownCircle, ArrowUpCircle, Plus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { AddExpenseModal } from "./AddExpenseModal";
import { AddIncomeModal } from "./AddIncomeModal";
import { TransferModal } from "./TransferModal";

type ActiveModal = "income" | "expense" | "transfer" | null;

// One shared menu + set of modals, rendered from TWO trigger buttons (a
// prominent inline one for desktop, a floating circular one for mobile) --
// per Prompt 6's explicit "+ Add" entry-point spec. Both triggers toggle the
// SAME `open` state, so there's exactly one menu instance regardless of
// viewport. Reads the active workspace from useAuth() rather than taking it
// as a prop, so it always matches whatever WorkspaceSwitcher currently has
// selected without needing to be re-mounted or prop-drilled through TopBar.
export function QuickAddButton() {
  const { activeBusinessId } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  if (!activeBusinessId) return null;

  function openModal(modal: ActiveModal) {
    setOpen(false);
    setActiveModal(modal);
  }

  const menu = open && (
    <>
      <button type="button" aria-label="Close menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
      <div className="absolute bottom-full right-0 z-50 mb-2 w-56 space-y-1 rounded-2xl bg-surface p-2 shadow-lg shadow-black/10 md:bottom-auto md:top-full md:mb-0 md:mt-2">
        <button
          type="button"
          onClick={() => openModal("income")}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-neutral-700 hover:bg-brand-primary/10 hover:text-brand-primary"
        >
          <ArrowUpCircle className="h-5 w-5 text-brand-primary" /> Add Income
        </button>
        <button
          type="button"
          onClick={() => openModal("expense")}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-neutral-700 hover:bg-brand-danger/10 hover:text-brand-danger"
        >
          <ArrowDownCircle className="h-5 w-5 text-brand-danger" /> Add Expense
        </button>
        <button
          type="button"
          onClick={() => openModal("transfer")}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          <ArrowLeftRight className="h-5 w-5 text-neutral-500" /> Transfer
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: prominent inline button */}
      <div className="relative hidden md:block">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
        {menu}
      </div>

      {/* Mobile: floating circular button, bottom-center */}
      <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 md:hidden">
        <div className="relative">
          {menu}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Add"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg shadow-brand-primary/30 hover:bg-brand-primary-hover"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>

      <AddIncomeModal open={activeModal === "income"} onClose={() => setActiveModal(null)} businessId={activeBusinessId} />
      <AddExpenseModal open={activeModal === "expense"} onClose={() => setActiveModal(null)} businessId={activeBusinessId} />
      <TransferModal open={activeModal === "transfer"} onClose={() => setActiveModal(null)} businessId={activeBusinessId} />
    </>
  );
}
