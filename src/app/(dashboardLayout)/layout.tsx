import { headers } from "next/headers";
import { redirect } from "next/navigation";
import DashboardNavbar from "@/components/modules/Dashboard/DashboardNavbar";
import DashboardSidebar from "@/components/modules/Dashboard/DashboardSidebar";
import { ADMIN_HOME_ROUTE, SESSION_EXPIRED_LOGIN_ROUTE } from "@/lib/authUtils";
import { getLocale } from "@/lib/i18n/locale";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getTranslationOverrides } from "@/lib/i18n/overrides";
import { getUserInfo } from "@/services/auth.services";
import { BreadcrumbProvider } from "@/components/modules/Dashboard/BreadcrumbTitle";

// The shell reads cookies (through getUserInfo), so it must be dynamic --
// otherwise it gets statically cached and every admin sees the first render.
export const dynamic = "force-dynamic";

// Where a session the backend refused goes: sign in again, then back to
// the page asked for. A layout can't see the URL, so proxy.ts names it in
// x-pathname; the dashboard needs no way back, a sign-in lands there anyway.
async function signInAgainRoute(): Promise<string> {
  const asked = (await headers()).get("x-pathname");
  if (!asked?.startsWith("/") || asked.split("?")[0] === ADMIN_HOME_ROUTE) return SESSION_EXPIRED_LOGIN_ROUTE;
  return `${SESSION_EXPIRED_LOGIN_ROUTE}&redirect=${encodeURIComponent(asked)}`;
}

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  // proxy.ts already bounced anyone without a session. This catches a token
  // the backend itself no longer accepts; getUserInfo is request-cached, so
  // the sidebar and navbar reuse this same round trip.
  const [admin, locale, overrides] = await Promise.all([getUserInfo(), getLocale(), getTranslationOverrides()]);
  if (!admin) {
    redirect(await signInAgainRoute());
  }

  return (
    <LocaleProvider initialLocale={locale} overrides={overrides} scope="admin">
      <BreadcrumbProvider>
        {/* The boards set no line height: text the panel sizes by hand (text-[13px]) sits on the font's own, not the page's 1.5. */}
        <div className="flex h-screen overflow-hidden bg-page leading-[normal] print:block print:h-auto print:overflow-visible">
          <DashboardSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden print:block print:overflow-visible">
            <DashboardNavbar />
            {/* id + tabIndex give the root layout's skip link a focus target. */}
            {/* The boards' admin frame: 24px above, 28px around. */}
            <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto px-4 py-4 outline-none md:px-7 md:pt-6 md:pb-7 print:overflow-visible print:p-0">
              {children}
            </main>
          </div>
        </div>
      </BreadcrumbProvider>
    </LocaleProvider>
  );
}
