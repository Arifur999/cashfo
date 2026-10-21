import { ArrowLeftRight, Compass, House } from "lucide-react";
import Link from "next/link";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import Button from "@/components/smartly/Button";
import StatePage from "@/components/smartly/StatePage";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { getTranslator } from "@/lib/i18n/locale";

// A missing page inside the app keeps the sidebar and top bar, so the
// customer is never stranded. The bar says "Page not found" rather than the
// menu entry the broken link sat under. With the admin-edited Bangla, like
// every other customer page.
export default async function CustomerNotFound() {
  const { t } = await getTranslator();

  return (
    <>
      <TopbarExtras title={t("Page not found")} />
      <StatePage
        standalone={false}
        icon={<Compass />}
        tone="insights"
        reference="404"
        title={t("We can't find that page")}
        description={t("It may have moved, or the link was typed wrong. If it was a transaction or a goal, it may have been deleted from another device.")}
        actions={
          <>
            <Button size="lg" asChild>
              <Link href={CUSTOMER_HOME_ROUTE}>
                <House />
                {t("Go to Home")}
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/transactions">
                <ArrowLeftRight />
                {t("Transactions")}
              </Link>
            </Button>
          </>
        }
      />
    </>
  );
}
