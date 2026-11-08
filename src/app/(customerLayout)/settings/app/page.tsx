import { redirect } from "next/navigation";
import { AppPreferencesSection } from "@/components/modules/Customer/Settings/AppPreferencesSection";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { homeDates } from "@/lib/customer/greeting";
import { getPrayerSettings } from "@/lib/customer/habits";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { APP_TIME_ZONE, getAppToday } from "@/lib/date";
import { getLocale } from "@/lib/i18n/locale";

export const generateMetadata = () => customerPageMetadata("/settings/app");

// Settings › App preferences: the open workspace's wallets for the default
// one (only for those who add entries there), and today's Hijri date for
// the preview.
export default async function SettingsAppPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const businessId = await resolveActiveBusinessId(user.businesses);
  const role = user.businesses.find((business) => business.id === businessId)?.role;
  const adds = Boolean(businessId) && (role === "OWNER" || role === "ACCOUNTANT");
  const [wallets, prayer, locale] = await Promise.all([adds && businessId ? getMoneyAccountsAction(businessId) : [], getPrayerSettings(), getLocale()]);
  const hijri = homeDates(new Date(), locale, APP_TIME_ZONE, prayer.hijriAdjust).hijri;
  return <AppPreferencesSection today={getAppToday()} businessId={adds ? businessId : null} wallets={wallets} hijri={hijri} />;
}
