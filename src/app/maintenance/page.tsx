import { Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PublicShell from "@/components/modules/Legal/PublicShell";
import { getPublicPlatform } from "@/lib/customer/platform";
import { getLocale } from "@/lib/i18n/locale";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { translate } from "@/lib/i18n/translate";

export const metadata: Metadata = { title: "Under maintenance" };
// Maintenance mode is switched in the admin panel; always ask.
export const dynamic = "force-dynamic";

// Where the customer app sends everyone while maintenance mode is on (Admin >
// Settings): the customer layout and every reader that gets the API's 503.
// Outside the customer shell on purpose -- a different layout, so landing
// here always renders it in full. Once maintenance is off, back home.
export default async function MaintenancePage() {
  const [platform, locale] = await Promise.all([getPublicPlatform(), getLocale()]);
  if (!platform.maintenance.enabled) {
    redirect("/");
  }
  const t = (key: string) => translate(locale, key);

  return (
    <LocaleProvider initialLocale={locale}>
      <PublicShell>
        <section className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Wrench className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="text-xl font-semibold text-foreground">{t("We'll be back soon")}</h1>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{platform.maintenance.message}</p>
          {platform.supportEmail && (
            <p className="text-sm text-muted-foreground">
              {t("Questions? Write to")}{" "}
              <a href={`mailto:${platform.supportEmail}`} className="font-medium text-foreground underline">
                {platform.supportEmail}
              </a>
            </p>
          )}
          <Link href="/maintenance" className="mt-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted">
            {t("Check again")}
          </Link>
        </section>
      </PublicShell>
    </LocaleProvider>
  );
}
