import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ThemeProvider } from "@/components/modules/Customer/Providers/ThemeProvider";
import { ChooseWorkspaceClient } from "@/components/modules/Customer/Workspace/ChooseWorkspaceClient";
import { CUSTOMER_HOME_ROUTE, MAINTENANCE_ROUTE, SESSION_EXPIRED_LOGIN_ROUTE } from "@/lib/authUtils";
import { getWorkspaceFigure } from "@/lib/customer/accounts";
import { resolveActiveWorkspace } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { isFeatureOn } from "@/lib/customer/features";
import { getPlatform } from "@/lib/customer/platform";
import { orderWorkspaces, safeNextPath, switchableWorkspaces } from "@/lib/customer/workspaceSwitch";
import { getLocale, getTranslator } from "@/lib/i18n/locale";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getTranslationOverrides } from "@/lib/i18n/overrides";
import { hasWorkspaceUnlock } from "@/lib/tokenUtils";

// Reads the session, the workspace cookie and the unlocks; always ask.
export const dynamic = "force-dynamic";

// The tab title, in the reader's language (the root layout adds the brand).
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t("Choose a workspace") };
}

// "Which workspace?" Deliberately a plain top-level route -- NOT under
// (customerLayout), so it renders without the app's sidebar and top bar;
// it brings the shell's language and theme itself. proxy.ts treats it like
// any other signed-in page.
//
// The customer layout sends someone here once, when they have more than one
// workspace and none is remembered on this device, with ?next= set to the
// page they were opening. "See all workspaces" in the account menu and the
// lock screen come here too. Picking a card remembers it and goes on to
// ?next= (only ever a page of the app) or Home. With one workspace there is
// nothing to choose, so it goes straight on -- and the layout never sends
// that account here, so the two can't bounce between each other.
export default async function ChooseWorkspacePage({ searchParams }: PageProps<"/choose-workspace">) {
  const { next: requested } = await searchParams;
  const next = safeNextPath(requested) ?? CUSTOMER_HOME_ROUTE;

  // In maintenance mode every customer call answers 503, as in the shell.
  const platform = await getPlatform();
  if (platform.maintenance.enabled) {
    redirect(MAINTENANCE_ROUTE);
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(SESSION_EXPIRED_LOGIN_ROUTE);
  }

  const workspaces = orderWorkspaces(switchableWorkspaces(user.businesses));
  if (workspaces.length <= 1) {
    redirect(next);
  }

  // A super admin's read-only view isn't asked for PINs (nor is it by the API).
  const viewAs = Boolean(user.impersonatedBy);
  const locked = workspaces.filter((business) => business.hasPinLock);
  const [active, locale, overrides, unlocked] = await Promise.all([
    resolveActiveWorkspace(user.businesses),
    getLocale(),
    getTranslationOverrides(),
    viewAs ? locked.map(() => true) : Promise.all(locked.map((business) => hasWorkspaceUnlock(business.id))),
  ]);
  const unlockedIds = locked.filter((_, index) => unlocked[index]).map((business) => business.id);

  // Each card's figure, read side by side. A PIN-locked workspace keeps its
  // figures behind the PIN until this device has entered it.
  const figures = await Promise.all(workspaces.map((business) => (business.hasPinLock && !unlockedIds.includes(business.id) ? null : getWorkspaceFigure(business.id))));

  return (
    <ThemeProvider allowDark={isFeatureOn(platform.flags, "dark_mode")}>
      <LocaleProvider initialLocale={locale} overrides={overrides}>
        <ChooseWorkspaceClient
          user={user}
          workspaces={workspaces}
          // The remembered one starts picked; otherwise the personal one.
          initialId={active.business?.id ?? null}
          unlockedIds={unlockedIds}
          figures={Object.fromEntries(workspaces.map((business, index) => [business.id, figures[index]]))}
          next={next}
        />
      </LocaleProvider>
    </ThemeProvider>
  );
}
