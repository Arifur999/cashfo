import { Mail, RefreshCw, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import StatePage from "@/components/smartly/StatePage";
import { BRAND_NAME } from "@/lib/brand";
import { getPublicPlatform } from "@/lib/customer/platform";
import { getLocale } from "@/lib/i18n/locale";
import { getTranslationOverrides } from "@/lib/i18n/overrides";
import { translate } from "@/lib/i18n/translate";

export const metadata: Metadata = { title: "Under maintenance" };
// Maintenance mode is switched in the admin panel; always ask.
export const dynamic = "force-dynamic";

// Where the customer app sends everyone while maintenance mode is on (Admin >
// Settings): the customer layout and every reader that gets the API's 503.
// Outside the customer shell on purpose -- a different layout, so landing
// here always renders it in full. Once maintenance is off, back home.
export default async function MaintenancePage() {
  const [platform, locale, overrides] = await Promise.all([getPublicPlatform(), getLocale(), getTranslationOverrides()]);
  if (!platform.maintenance.enabled) {
    redirect("/");
  }
  const t = (key: string) => translate(locale, key, overrides);

  return (
    <StatePage
      icon={<Wrench />}
      tone="warning"
      reference={t("Scheduled maintenance")}
      title={`${BRAND_NAME} ${t("is getting an upgrade")}`}
      description={t("Your data is safe and you can still read everything. Changes are paused for a short while so nothing gets lost.")}
      actions={
        <>
          <Button size="xl" asChild>
            <Link href="/maintenance">
              <RefreshCw />
              {t("Check again")}
            </Link>
          </Button>
          {platform.supportEmail && (
            <Button size="xl" variant="secondary" asChild>
              <a href={`mailto:${platform.supportEmail}`}>
                <Mail />
                {t("Write to support")}
              </a>
            </Button>
          )}
        </>
      }
    >
      {platform.maintenance.message && (
        <Card className="mt-2 w-full max-w-3xl text-left">
          <span className="text-caption font-bold text-ink-muted uppercase">{t("Message from the team")}</span>
          <p className="mt-2 text-body leading-relaxed whitespace-pre-line text-ink-2">{platform.maintenance.message}</p>
        </Card>
      )}
    </StatePage>
  );
}
