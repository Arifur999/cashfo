"use client";

import { TriangleAlert } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContext, use, useContext } from "react";
import Banner from "@/components/smartly/Banner";
import { LOGIN_ROUTE, REGISTER_ROUTE } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export interface MaintenanceState {
  enabled: boolean;
  // The admin's own words, as typed (not translated).
  message: string;
}

// The (auth) layout's one read of maintenance mode, handed down by AuthShell.
// The notice and the forms all read this same promise: the layout isn't
// re-rendered on client navigation, so a second read in a page could
// disagree with the notice above it.
export const MaintenanceContext = createContext<Promise<MaintenanceState> | null>(null);

// Suspends until the layout's read answers (it never rejects: the read falls
// back to "open"). Null outside the auth pages.
export function useMaintenance(): MaintenanceState | null {
  const maintenance = useContext(MaintenanceContext);
  return maintenance ? use(maintenance) : null;
}

// What maintenance means for the page it shows on: signing in still works
// (the app then waits on the maintenance page), while the API refuses
// sign-up and the password reset until it ends.
const PAGE_LINES: Record<string, string> = {
  [LOGIN_ROUTE]: "You can sign in; the app opens again when we're done.",
  [REGISTER_ROUTE]: "Sign-up is paused until then.",
};
const PASSWORD_LINE = "Password reset is paused until then; ask for a new link afterwards.";

// While maintenance mode is on (Admin > Settings), the sign-in pages say so,
// and what it means for the form below. Admins are unaffected. Marked as a
// notice, so the phone hero card makes room for it.
export default function MaintenanceNotice() {
  const maintenance = useMaintenance();
  const pathname = usePathname();
  const { t } = useLocale();
  if (!maintenance?.enabled) return null;

  return (
    <Banner tone="warning" inline icon={<TriangleAlert />} className="font-normal" data-auth-notice="">
      <p className="font-semibold">{t("Under maintenance")}</p>
      <p className="mt-0.5">{t(PAGE_LINES[pathname] ?? PASSWORD_LINE)}</p>
      {maintenance.message && <p className="mt-1.5 whitespace-pre-line">{maintenance.message}</p>}
    </Banner>
  );
}
