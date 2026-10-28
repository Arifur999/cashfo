"use client";

import { TriangleAlert } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContext, use, useContext } from "react";
import Banner from "@/components/smartly/Banner";
import { LOGIN_ROUTE, REGISTER_ROUTE, VERIFY_EMAIL_ROUTE } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export interface MaintenanceState {
  enabled: boolean;
  // The admin's own words, as typed (not translated), and their Bangla
  // when they wrote one.
  message: string;
  messageBn?: string | null;
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
  [VERIFY_EMAIL_ROUTE]: "Confirming your email is paused until then; open the link again afterwards.",
};
const PASSWORD_LINE = "Password reset is paused until then; ask for a new link afterwards.";

// While maintenance mode is on (Admin > Settings), the sign-in pages say so,
// and what it means for the form below. Admins are unaffected.
export default function MaintenanceNotice() {
  const maintenance = useMaintenance();
  const pathname = usePathname();
  const { locale, t } = useLocale();
  // The admin panel's own pages (an invite, a reset) aren't paused.
  if (!maintenance?.enabled || pathname.startsWith("/admin/")) return null;
  const message = (locale === "bn" && maintenance.messageBn) || maintenance.message;

  return (
    <Banner tone="warning" inline icon={<TriangleAlert />} className="font-normal" data-auth-notice="">
      <p className="font-semibold">{t("Under maintenance")}</p>
      <p className="mt-0.5">{t(PAGE_LINES[pathname] ?? PASSWORD_LINE)}</p>
      {message && <p className="mt-1.5 whitespace-pre-line">{message}</p>}
    </Banner>
  );
}
