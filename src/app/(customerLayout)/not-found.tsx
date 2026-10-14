import { ArrowLeftRight, Compass, House } from "lucide-react";
import Link from "next/link";
import Button from "@/components/smartly/Button";
import StatePage from "@/components/smartly/StatePage";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { getLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

// A missing page inside the app keeps the sidebar and top bar, so the
// customer is never stranded.
export default async function CustomerNotFound() {
  const locale = await getLocale();
  const t = (key: string) => translate(locale, key);

  return (
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
  );
}
