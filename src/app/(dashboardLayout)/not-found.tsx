import { Compass, House } from "lucide-react";
import Link from "next/link";
import Button from "@/components/smartly/Button";
import StatePage from "@/components/smartly/StatePage";
import { ADMIN_HOME_ROUTE } from "@/lib/authUtils";
import { getTranslator } from "@/lib/i18n/locale";

// An unknown URL, or a detail page whose record doesn't exist (see
// fetchOrNotFound) and that has no not-found page of its own. Rendered
// inside the dashboard shell, with the site's "We can't find that page";
// the shell's main already pads the content area, so the page adds none.
export default async function DashboardNotFound() {
  const { t, locale } = await getTranslator("admin");

  return (
    <StatePage
      standalone={false}
      locale={locale}
      className="p-0 md:p-0"
      icon={<Compass />}
      tone="insights"
      reference="404"
      title={t("We can't find that page")}
      description={t("The page or record you're looking for doesn't exist, or was removed.")}
      actions={
        <Button size="lg" asChild>
          <Link href={ADMIN_HOME_ROUTE}>
            <House />
            {t("Back to dashboard")}
          </Link>
        </Button>
      }
    />
  );
}
