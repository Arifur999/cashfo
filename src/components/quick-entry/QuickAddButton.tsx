"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { AddTransactionModal } from "./AddTransactionModal";

// Mobile-only fallback entry point: the desktop "+ Add Transaction" button
// now lives on the Transactions page itself (see TransactionsPageClient),
// matching the reference design where it's a page-level action rather than
// a persistent global one. This floating button keeps mobile users (who
// don't get the page-level button treatment) able to add a transaction from
// any page. Transfer isn't offered here; it has its own dedicated page at
// /balance/transfer (linked from the sidebar).
export function QuickAddButton() {
  const { activeBusinessId, activeBusiness } = useAuth();
  const [open, setOpen] = useState(false);

  if (!activeBusinessId) return null;

  return (
    <>
      {/* Mobile: floating circular button, bottom-center */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add Transaction"
        className="fixed bottom-6 left-1/2 z-30 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg shadow-brand-primary/30 hover:bg-brand-primary-hover md:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AddTransactionModal
        open={open}
        onClose={() => setOpen(false)}
        businessId={activeBusinessId}
        currency={activeBusiness?.currency ?? "BDT"}
      />
    </>
  );
}
