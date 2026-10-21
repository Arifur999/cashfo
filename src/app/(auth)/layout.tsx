import AuthShell from "@/components/modules/Auth/AuthShell";
import type { MaintenanceState } from "@/components/modules/Auth/MaintenanceNotice";
import { getPublicPlatform } from "@/lib/customer/platform";
import { getLocale } from "@/lib/i18n/locale";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getTranslationOverrides } from "@/lib/i18n/overrides";

// Sign in, sign up and password reset, in English or Bangla -- before an
// account exists to keep a language preference on. The frame (hero, header,
// legal links) is drawn here once, so moving between these pages swaps only
// the form column and its loading state.
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const [locale, overrides] = await Promise.all([getLocale(), getTranslationOverrides()]);
  // Not awaited: the form shows at once, and the maintenance notice follows
  // when the API answers.
  const maintenance: Promise<MaintenanceState> = getPublicPlatform().then((platform) => ({
    enabled: platform.maintenance?.enabled === true,
    message: platform.maintenance?.message ?? "",
  }));

  return (
    <LocaleProvider initialLocale={locale} overrides={overrides}>
      <AuthShell maintenance={maintenance}>{children}</AuthShell>
    </LocaleProvider>
  );
}
