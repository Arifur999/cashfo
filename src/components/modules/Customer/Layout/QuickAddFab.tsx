"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { AddTransactionModal } from "@/components/modules/Customer/QuickEntry/AddTransactionModal";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The floating + on phones, bottom right, opening New transaction. On
// wider screens the top bar's Add menu covers it.
export function QuickAddFab() {
  const { activeBusinessId, activeBusiness } = useAuth();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  if (!activeBusinessId) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("Add transaction")}
        className="fixed right-4 bottom-6 z-30 flex size-14 items-center justify-center rounded-full bg-forest text-white shadow-float md:hidden dark:bg-emerald dark:text-on-action"
      >
        <Plus className="size-6" strokeWidth={2.25} aria-hidden="true" />
      </button>
      <AddTransactionModal open={open} onClose={() => setOpen(false)} businessId={activeBusinessId} currency={activeBusiness?.currency ?? "BDT"} />
    </>
  );
}
