import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ThemeProvider } from "@/components/modules/Customer/Providers/ThemeProvider";
import { WorkspaceLockScreen } from "@/components/modules/Customer/Workspace/WorkspaceLockScreen";
import { CUSTOMER_HOME_ROUTE, MAINTENANCE_ROUTE, SESSION_EXPIRED_LOGIN_ROUTE } from "@/lib/authUtils";
import { getCurrentUser } from "@/lib/customer/auth";
import { isFeatureOn } from "@/lib/customer/features";
import { getPlatform } from "@/lib/customer/platform";
import { switchableWorkspaces, workspaceName } from "@/lib/customer/workspaceSwitch";
import { getLocale, getTranslator } from "@/lib/i18n/locale";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getTranslationOverrides } from "@/lib/i18n/overrides";

// Reads the session and the workspace's lock; always ask.
export const dynamic = "force-dynamic";

// The tab title, in the reader's language (the root layout adds the brand).
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t("Workspace locked") };
}

// Where a page lands when the API says its workspace is PIN-locked (see
// lib/customer/readFallback.ts) -- usually because the 12-hour unlock ran
// out, or the PIN was changed on another device. Outside the customer shell,
// whose own lock check would otherwise trust the cookie that just failed, so
// it brings the shell's language and theme itself.
export default async function UnlockWorkspacePage({ searchParams }: PageProps<"/unlock-workspace">) {
  const { id } = await searchParams;
  // In maintenance mode every customer call answers 503, as in the shell.
  const platform = await getPlatform();
  if (platform.maintenance.enabled) {
    redirect(MAINTENANCE_ROUTE);
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(SESSION_EXPIRED_LOGIN_ROUTE);
  }

  const business = user.businesses.find((b) => b.id === id);
  // Group workspaces live at their own page; the rest is the main app.
  const home = business?.type === "GROUP" ? `/group-expenses/${business.id}` : CUSTOMER_HOME_ROUTE;
  // Asks even when this device holds an unlock -- the API just refused it,
  // and sending it back home would loop. Only a workspace without a lock
  // goes straight there.
  if (!business?.hasPinLock) {
    redirect(home);
  }

  const [locale, overrides] = await Promise.all([getLocale(), getTranslationOverrides()]);
  // Someone who doesn't know this PIN can open another workspace instead.
  const canChooseAnother = switchableWorkspaces(user.businesses).some((b) => b.id !== business.id);

  return (
    <ThemeProvider allowDark={isFeatureOn(platform.flags, "dark_mode")}>
      <LocaleProvider initialLocale={locale} overrides={overrides}>
        <WorkspaceLockScreen
          businessId={business.id}
          businessName={workspaceName(business, user.name)}
          isOwner={business.role === "OWNER"}
          next={home}
          canChooseAnother={canChooseAnother}
        />
      </LocaleProvider>
    </ThemeProvider>
  );
}
