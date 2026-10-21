import { redirect } from "next/navigation";
import { AnnouncementBanner } from "@/components/modules/Customer/Layout/AnnouncementBanner";
import { AppSidebar } from "@/components/modules/Customer/Layout/AppSidebar";
import { AppTopbar } from "@/components/modules/Customer/Layout/AppTopbar";
import { OfflineBanner } from "@/components/modules/Customer/Layout/OfflineBanner";
import { OwnerViewBanner } from "@/components/modules/Customer/Layout/OwnerViewBanner";
import { TopbarProvider } from "@/components/modules/Customer/Layout/TopbarExtras";
import { QuickAddFab } from "@/components/modules/Customer/Layout/QuickAddFab";
import { AuthProvider } from "@/components/modules/Customer/Providers/AuthProvider";
import { PlatformProvider } from "@/components/modules/Customer/Providers/PlatformProvider";
import { PrayerSettingsProvider } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import { ThemeProvider } from "@/components/modules/Customer/Providers/ThemeProvider";
import { TodayTasksProvider } from "@/components/modules/Customer/Providers/TodayTasksProvider";
import { ChooseWorkspaceRedirect } from "@/components/modules/Customer/Workspace/ChooseWorkspaceRedirect";
import { WorkspaceLockScreen } from "@/components/modules/Customer/Workspace/WorkspaceLockScreen";
import { MAINTENANCE_ROUTE, SESSION_EXPIRED_LOGIN_ROUTE } from "@/lib/authUtils";
import { resolveActiveWorkspace } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { isFeatureOn } from "@/lib/customer/features";
import { getPrayerSettings } from "@/lib/customer/habits";
import { getPlatform } from "@/lib/customer/platform";
import { needsWorkspaceChoice, switchableWorkspaces, workspaceName } from "@/lib/customer/workspaceSwitch";
import { getLocale } from "@/lib/i18n/locale";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getTranslationOverrides } from "@/lib/i18n/overrides";
import { hasWorkspaceUnlock } from "@/lib/tokenUtils";
import { AddActionsProvider } from "@/components/modules/Customer/Layout/AddActionsProvider";

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

  const [workspace, locale, overrides, prayerSettings] = await Promise.all([resolveActiveWorkspace(user.businesses), getLocale(), getTranslationOverrides(), getPrayerSettings()]);
  const allowDark = isFeatureOn(platform.flags, "dark_mode");
  const viewAs = Boolean(user.impersonatedBy);
  const choices = switchableWorkspaces(user.businesses);

  // More than one workspace and none chosen on this device: ask which,
  // once. The choice is remembered, so the next visit opens straight in.
  if (needsWorkspaceChoice({ remembered: workspace.remembered, choices: choices.length, viewAs })) {
    return (
      <ThemeProvider allowDark={allowDark}>
        <LocaleProvider initialLocale={locale} overrides={overrides}>
          <ChooseWorkspaceRedirect />
        </LocaleProvider>
      </ThemeProvider>
    );
  }

  // Which locked workspaces this device has opened, for the switchers. A
  // super admin's read-only view isn't asked for PINs (the API doesn't ask
  // it either).
  const locked = choices.filter((business) => business.hasPinLock);
  const unlocked = viewAs ? locked.map(() => true) : await Promise.all(locked.map((business) => hasWorkspaceUnlock(business.id)));
  const unlockedBusinessIds = locked.filter((_, index) => unlocked[index]).map((business) => business.id);

  // A PIN-locked workspace asks for its PIN first, on whatever page was
  // opened, and stays on it once it opens.
  const activeBusiness = workspace.business;
  const activeBusinessId = activeBusiness?.id ?? null;
  if (activeBusiness?.hasPinLock && !unlockedBusinessIds.includes(activeBusiness.id)) {
    return (
      <ThemeProvider allowDark={allowDark}>
        <LocaleProvider initialLocale={locale} overrides={overrides}>
          <WorkspaceLockScreen
            businessId={activeBusiness.id}
            businessName={workspaceName(activeBusiness, user.name)}
            isOwner={activeBusiness.role === "OWNER"}
            canChooseAnother={choices.length > 1}
          />
        </LocaleProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider allowDark={allowDark}>
      <AuthProvider initialUser={user} initialActiveBusinessId={activeBusinessId} unlockedBusinessIds={unlockedBusinessIds}>
        <LocaleProvider initialLocale={locale} overrides={overrides}>
          <PlatformProvider value={{ flags: platform.flags, supportEmail: platform.supportEmail }}>
            <PrayerSettingsProvider initial={prayerSettings}>
              <TodayTasksProvider>
                <TopbarProvider>
                  <AddActionsProvider>
                    {/* The Night sidebar on the left; the top bar and the one
                        scrolling region on the right. */}
                    <div className="flex h-screen overflow-hidden bg-page print:block print:h-auto print:overflow-visible">
                      <AppSidebar />
                      <div className="flex min-w-0 flex-1 flex-col overflow-hidden print:block print:overflow-visible">
                        {user.impersonatedBy && <OwnerViewBanner customerName={user.name} adminName={user.impersonatedBy.name} />}
                        <AppTopbar />
                        {/* id + tabIndex give the root layout's skip link a target. */}
                        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto outline-none print:overflow-visible">
                          <OfflineBanner />
                          <AnnouncementBanner announcements={platform.announcements} />
                          {children}
                        </main>
                      </div>
                    </div>
                    <QuickAddFab />
                  </AddActionsProvider>
                </TopbarProvider>
              </TodayTasksProvider>
            </PrayerSettingsProvider>
          </PlatformProvider>
        </LocaleProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
