import { redirect } from "next/navigation";
import { Sidebar } from "@/components/modules/Customer/Layout/Sidebar";
import { TopBar } from "@/components/modules/Customer/Layout/TopBar";
import { AuthProvider } from "@/components/modules/Customer/Providers/AuthProvider";
import { ThemeProvider } from "@/components/modules/Customer/Providers/ThemeProvider";
import { SESSION_EXPIRED_LOGIN_ROUTE } from "@/lib/authUtils";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getLocale } from "@/lib/i18n/locale";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";

// The shell reads cookies (the session, the language), so it must be
// dynamic -- otherwise it gets statically cached for every customer.
export const dynamic = "force-dynamic";

// The customer app. proxy.ts already sent everyone else elsewhere; this
// catches a token the backend itself no longer accepts, and fetches the
// customer every page under it reads through useAuth().
export default async function CustomerLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(SESSION_EXPIRED_LOGIN_ROUTE);
  }

  const [activeBusinessId, locale] = await Promise.all([resolveActiveBusinessId(user.businesses), getLocale()]);

  return (
    <ThemeProvider>
      <AuthProvider initialUser={user} initialActiveBusinessId={activeBusinessId}>
        <LocaleProvider initialLocale={locale}>
          <div className="flex h-screen overflow-hidden bg-brand-content">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <TopBar />
              {/* The only scrollable region: the sidebar and top bar stay put.
                  id + tabIndex give the root layout's skip link a target. */}
              <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto outline-none">
                {children}
              </main>
            </div>
          </div>
        </LocaleProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
