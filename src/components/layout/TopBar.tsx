"use client";

import { Languages } from "lucide-react";
import { QuickAddButton } from "@/components/quick-entry/QuickAddButton";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

// Page navigation (Dashboard, Accounts, ...) lives in Sidebar.tsx now --
// this bar is just cross-cutting utilities that make sense next to the
// user's identity, same split as admin-frontend's Sidebar+TopBar.
// QuickAddButton renders both the desktop inline "+ Add" trigger (shown
// here) AND the mobile floating one (fixed-positioned, so it's visible
// regardless of where in the tree it's mounted) -- one mount covers both.
// UserMenu (avatar + dropdown) replaced the old standalone "Sign Out"
// button -- logout now lives inside that dropdown, alongside Profile/
// Settings links, matching the reference layout.
//
// The multi-workspace switcher (and its "Manage workspaces" gear icon) was
// removed by product decision -- every account is single-workspace now, so
// there's nothing to switch between or manage from here. See
// activeBusiness.ts's resolveActiveBusinessId(), which now always resolves
// to the account's one default workspace regardless of any stored
// selection from before this change.
//
// Language toggle mirrors admin-frontend's own TopBar (same useLocale()
// hook shape, same single-button "show the OTHER language's name" pattern)
// -- this is a Client Component now (it wasn't before) purely because
// useLocale() needs to run in the browser.
export function TopBar() {
  const { locale, toggleLocale } = useLocale();

  return (
    <header className="flex h-16 items-center justify-end gap-3 border-b border-neutral-100 bg-surface px-6">
      <QuickAddButton />
      <button
        type="button"
        onClick={toggleLocale}
        aria-label="Toggle language"
        className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
      >
        <Languages className="h-4 w-4" />
        {locale === "en" ? "বাংলা" : "English"}
      </button>
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
