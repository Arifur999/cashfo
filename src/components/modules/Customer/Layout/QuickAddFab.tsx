"use client";

import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { WithAddActions } from "./AddActionsProvider";
import { AddSheet } from "./AddSheet";

const VAULT_PAGE = "/password-manager";

// Settings has nothing to add. The vault keeps this corner to itself: a
// locked one asks for its password first, and an open one floats its own
// + for a new login on this very spot (an empty one adds from its tiles).
const shownOn = (pathname: string) => !(pathname === "/settings" || pathname.startsWith("/settings/") || pathname === VAULT_PAGE);

// The floating + on phones, bottom right, opening the Add sheet: everything
// the top bar's Add menu offers. On wider screens that menu covers it.
export function QuickAddFab() {
  return (
    <WithAddActions>
      <Fab />
    </WithAddActions>
  );
}

function Fab() {
  const pathname = usePathname();
  const { activeBusinessId } = useAuth();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  if (!activeBusinessId || !shownOn(pathname)) return null;

  return (
    <AddSheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        aria-label={t("Add")}
        className="fixed right-4 bottom-6 z-30 flex size-14 items-center justify-center rounded-full bg-forest text-white shadow-float md:hidden dark:bg-emerald dark:text-on-action"
      >
        <Plus className="size-6" strokeWidth={2.25} aria-hidden="true" />
      </button>
    </AddSheet>
  );
}
