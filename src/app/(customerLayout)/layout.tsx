import { redirect } from "next/navigation";
import { AnnouncementBanner } from "@/components/modules/Customer/Layout/AnnouncementBanner";
import { Sidebar } from "@/components/modules/Customer/Layout/Sidebar";
import { TopBar } from "@/components/modules/Customer/Layout/TopBar";
import { AuthProvider } from "@/components/modules/Customer/Providers/AuthProvider";
import { PlatformProvider } from "@/components/modules/Customer/Providers/PlatformProvider";
import { ThemeProvider } from "@/components/modules/Customer/Providers/ThemeProvider";
import { MAINTENANCE_ROUTE, SESSION_EXPIRED_LOGIN_ROUTE } from "@/lib/authUtils";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { isFeatureOn } from "@/lib/customer/features";
import { getPlatform } from "@/lib/customer/platform";
import { getLocale } from "@/lib/i18n/locale";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";

// The shell reads cookies (the session, the language), so it must be
// dynamic -- otherwise it gets statically cached for every customer.
export const dynamic = "force-dynamic";

// The customer app. proxy.ts already sent everyone else elsewhere; this
// catches a token the backend itself no longer accepts, and fetches the
// customer every page under it reads through useAuth().
export default async function CustomerLayout({ children }: LayoutProps<"/">) {
  // First: in maintenance mode every other customer call answers 503.
  const platform = await getPlatform();
  if (platform.maintenance.enabled) {
    redirect(MAINTENANCE_ROUTE);
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(SESSION_EXPIRED_LOGIN_ROUTE);
  }

  const [activeBusinessId, locale] = await Promise.all([resolveActiveBusinessId(user.businesses), getLocale()]);

  return (
    <ThemeProvider allowDark={isFeatureOn(platform.flags, "dark_mode")}>
      <AuthProvider initialUser={user} initialActiveBusinessId={activeBusinessId}>
        <LocaleProvider initialLocale={locale}>
          <PlatformProvider value={{ flags: platform.flags, supportEmail: platform.supportEmail }}>
            <div className="flex h-screen overflow-hidden bg-brand-content">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <TopBar />
                {/* The only scrollable region: the sidebar and top bar stay put.
                    id + tabIndex give the root layout's skip link a target. */}
                <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto outline-none">
                  <AnnouncementBanner announcements={platform.announcements} />
                  {children}
                </main>
              </div>
            </div>
          </PlatformProvider>
        </LocaleProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
