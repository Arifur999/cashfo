import PublicShell from "@/components/modules/Legal/PublicShell";
import { getLocale } from "@/lib/i18n/locale";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getTranslationOverrides } from "@/lib/i18n/overrides";

// Terms, Privacy, Refund policy and FAQ: open to everyone, signed in or not
// (openRoutes in lib/authUtils.ts), in English or Bangla.
export default async function LegalLayout({ children }: LayoutProps<"/">) {
  const [locale, overrides] = await Promise.all([getLocale(), getTranslationOverrides()]);
  return (
    <LocaleProvider initialLocale={locale} overrides={overrides}>
      <PublicShell>{children}</PublicShell>
    </LocaleProvider>
  );
}
