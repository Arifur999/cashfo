import { Wrench } from "lucide-react";
import { redirect } from "next/navigation";
import { bnOverline } from "@/components/modules/Auth/bnType";
import { publicPageTitle } from "@/components/modules/Legal/publicPageTitle";
import Card from "@/components/smartly/Card";
import Eyebrow from "@/components/smartly/Eyebrow";
import StatePage from "@/components/smartly/StatePage";
import { BRAND_NAME } from "@/lib/brand";
import { getPublicPlatform } from "@/lib/customer/platform";
import { fillText } from "@/lib/i18n/fill";
import { getLocale } from "@/lib/i18n/locale";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getTranslationOverrides } from "@/lib/i18n/overrides";
import { translate } from "@/lib/i18n/translate";
import { getAccessToken } from "@/lib/tokenUtils";
import MaintenanceActions from "./MaintenanceActions";

export const generateMetadata = publicPageTitle("Under maintenance");
// Maintenance mode is switched in the admin panel; always ask.
export const dynamic = "force-dynamic";

// Where the customer app sends everyone while maintenance mode is on (Admin >
// Settings): the customer layout and every reader that gets the API's 503.
// Outside the customer shell on purpose -- a different layout, so landing
// here always renders it in full. Once maintenance is off, back home. The
// LocaleProvider gives the page its Bangla face and <html lang>, and the
// buttons their words.
export default async function MaintenancePage() {
  const [platform, locale, overrides, signedIn] = await Promise.all([getPublicPlatform(), getLocale(), getTranslationOverrides(), getAccessToken().then(Boolean)]);
  if (!platform.maintenance.enabled) {
    redirect("/");
  }
  const t = (key: string, values?: Record<string, string>) => {
    const text = translate(locale, key, overrides);
    return values ? fillText(text, values) : text;
  };

  return (
    <LocaleProvider initialLocale={locale} overrides={overrides}>
      {/* Its own main landmark, the skip link's target, in the page's
          language. */}
      <StatePage
        main
        locale={locale}
        homeLabel={t("{brand} home", { brand: BRAND_NAME })}
        icon={<Wrench />}
        tone="warning"
        // Words, so the page's face (the mono one has no Bangla).
        reference={<span className={locale === "bn" ? "font-bn" : undefined}>{t("Scheduled maintenance")}</span>}
        title={t("{brand} is getting an upgrade", { brand: BRAND_NAME })}
        description={t("Your data is safe. Everything is paused for a short while so nothing gets lost.")}
        actions={<MaintenanceActions supportEmail={platform.supportEmail} signedIn={signedIn} />}
      >
        {platform.maintenance.message && (
          <Card padding="none" elevated={false} className="mt-2 w-full max-w-190 px-5 py-4 text-left">
            <Eyebrow tone="neutral" className={bnOverline(locale)}>
              {t("Message from the team")}
            </Eyebrow>
            <p className="mt-2 text-body leading-[21px] whitespace-pre-line text-ink-2">{platform.maintenance.message}</p>
          </Card>
        )}
      </StatePage>
    </LocaleProvider>
  );
}
