import { redirect } from "next/navigation";
import DashboardNavbar from "@/components/modules/Dashboard/DashboardNavbar";
import DashboardSidebar from "@/components/modules/Dashboard/DashboardSidebar";
import { SESSION_EXPIRED_LOGIN_ROUTE } from "@/lib/authUtils";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getUserInfo } from "@/services/auth.services";

// The shell reads cookies (through getUserInfo), so it must be dynamic --
// otherwise it gets statically cached and every admin sees the first render.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  // proxy.ts already bounced anyone without a session. This catches a token
  // the backend itself no longer accepts; getUserInfo is request-cached, so
  // the sidebar and navbar reuse this same round trip.
  const admin = await getUserInfo();
  if (!admin) {
    redirect(SESSION_EXPIRED_LOGIN_ROUTE);
  }

  return (
    <LocaleProvider>
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardNavbar />
          {/* id + tabIndex give the root layout's skip link a focus target. */}
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 outline-none md:p-8">
            {children}
          </main>
        </div>
      </div>
    </LocaleProvider>
  );
}
