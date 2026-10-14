import { getLocale } from "@/lib/i18n/locale";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getTranslationOverrides } from "@/lib/i18n/overrides";

// Sign in, sign up and password reset, in English or Bangla -- before an
// account exists to keep a language preference on. Each page draws its own
// AuthShell, since the hero beside the form differs by page.
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const [locale, overrides] = await Promise.all([getLocale(), getTranslationOverrides()]);
  return (
    <LocaleProvider initialLocale={locale} overrides={overrides}>
      {children}
    </LocaleProvider>
  );
}
