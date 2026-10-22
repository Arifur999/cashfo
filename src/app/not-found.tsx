import { Compass, House } from "lucide-react";
import Link from "next/link";
import { publicPageTitle } from "@/components/modules/Legal/publicPageTitle";
import Button from "@/components/smartly/Button";
import StatePage from "@/components/smartly/StatePage";
import { BRAND_NAME } from "@/lib/brand";
import { fillText } from "@/lib/i18n/fill";
import { getLocale } from "@/lib/i18n/locale";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getTranslationOverrides } from "@/lib/i18n/overrides";
import { translate } from "@/lib/i18n/translate";

// The root not-found sets its own tab title, which otherwise reads just
// "Smartly".
export const generateMetadata = publicPageTitle("Page not found");

// Outside any dashboard shell: a URL no route matches at all. "/" sends a
// signed-in visitor to their own home and everyone else to the sign-in page.
// The LocaleProvider gives the page its Bangla face and <html lang>.
export default async function RootNotFound() {
  const [locale, overrides] = await Promise.all([getLocale(), getTranslationOverrides()]);
  const t = (key: string) => translate(locale, key, overrides);

  return (
    <LocaleProvider initialLocale={locale} overrides={overrides}>
      {/* Its own main landmark, the skip link's target, in the page's
          language. */}
      <StatePage
        main
        locale={locale}
        homeLabel={fillText(t("{brand} home"), { brand: BRAND_NAME })}
        icon={<Compass />}
        tone="insights"
        reference="404"
        title={t("We can't find that page")}
        description={t("It may have moved, or the link was typed wrong.")}
        actions={
          <Button size="xl" asChild>
            <Link href="/">
              <House />
              {t("Go to Home")}
            </Link>
          </Button>
        }
      />
    </LocaleProvider>
  );
}
