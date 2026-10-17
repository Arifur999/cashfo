import { redirect } from "next/navigation";
import DashboardNavbar from "@/components/modules/Dashboard/DashboardNavbar";
import DashboardSidebar from "@/components/modules/Dashboard/DashboardSidebar";
import { SESSION_EXPIRED_LOGIN_ROUTE } from "@/lib/authUtils";
import { getLocale } from "@/lib/i18n/locale";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getTranslationOverrides } from "@/lib/i18n/overrides";
import { getUserInfo } from "@/services/auth.services";
import { BreadcrumbProvider } from "@/components/modules/Dashboard/BreadcrumbTitle";

// The shell reads cookies (through getUserInfo), so it must be dynamic --
// otherwise it gets statically cached and every admin sees the first render.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  // proxy.ts already bounced anyone without a session. This catches a token
  // the backend itself no longer accepts; getUserInfo is request-cached, so
  // the sidebar and navbar reuse this same round trip.
  const [admin, locale, overrides] = await Promise.all([getUserInfo(), getLocale(), getTranslationOverrides()]);
  if (!admin) {
    redirect(SESSION_EXPIRED_LOGIN_ROUTE);
  }

  return (
    <LocaleProvider initialLocale={locale} overrides={overrides} scope="admin">
      <BreadcrumbProvider>
        <div className="flex h-screen overflow-hidden bg-cream print:block print:h-auto print:overflow-visible">
          <DashboardSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden print:block print:overflow-visible">
            <DashboardNavbar />
            {/* id + tabIndex give the root layout's skip link a focus target. */}
            {/* The design's admin frame: 24px above, 32px around. */}
            <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto px-4 py-4 outline-none md:px-8 md:pt-6 md:pb-8 print:overflow-visible print:p-0">
              {children}
            </main>
          </div>
        </div>
      </BreadcrumbProvider>
    </LocaleProvider>
  );
}
