"use client";

import { Plus } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { TransactionDrawer } from "@/components/modules/Customer/QuickEntry/TransactionDrawer";
import { findNavLocation, movesMoney } from "@/lib/customer/nav";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useNavSections } from "./SidebarNav";

// The floating + on phones, bottom right, opening New transaction, on the
// pages that move money (as the phone boards draw it). On wider screens
// the top bar's Add menu covers it.
export function QuickAddFab() {
  const { activeBusinessId, activeBusiness } = useAuth();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const location = findNavLocation(usePathname(), useSearchParams(), useNavSections());

  if (!activeBusinessId || !movesMoney(location)) return null;

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
      <TransactionDrawer open={open} onClose={() => setOpen(false)} businessId={activeBusinessId} currency={activeBusiness?.currency ?? "BDT"} />
    </>
  );
}
