import { getLocale } from "@/lib/i18n/locale";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getTranslationOverrides } from "@/lib/i18n/overrides";

// Shared profile cards: open to everyone, signed in or not (proxy.ts), in
// the visitor's language.
export default async function CardLayout({ children }: LayoutProps<"/card">) {
  const [locale, overrides] = await Promise.all([getLocale(), getTranslationOverrides()]);
  return (
    <LocaleProvider initialLocale={locale} overrides={overrides}>
      {children}
    </LocaleProvider>
  );
}
