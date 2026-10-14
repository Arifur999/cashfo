import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WorkspaceLockScreen } from "@/components/modules/Customer/Workspace/WorkspaceLockScreen";
import { CUSTOMER_HOME_ROUTE, SESSION_EXPIRED_LOGIN_ROUTE } from "@/lib/authUtils";
import { getCurrentUser } from "@/lib/customer/auth";
import { getLocale } from "@/lib/i18n/locale";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";

export const metadata: Metadata = { title: "Workspace locked" };
// Reads the session and the workspace's lock; always ask.
export const dynamic = "force-dynamic";

// Where a page lands when the API says its workspace is PIN-locked (see
// lib/customer/readFallback.ts) -- usually because the 12-hour unlock ran
// out, or the PIN was changed on another device. Outside the customer shell,
// whose own lock check would otherwise trust the cookie that just failed.
export default async function UnlockWorkspacePage({ searchParams }: PageProps<"/unlock-workspace">) {
  const { id } = await searchParams;
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

  return (
    <LocaleProvider initialLocale={await getLocale()}>
      <WorkspaceLockScreen
        businessId={business.id}
        businessName={business.isDefault ? user.name : business.name}
        isOwner={business.role === "OWNER"}
        next={home}
      />
    </LocaleProvider>
  );
}
