import { Compass, House } from "lucide-react";
import Link from "next/link";
import Button from "@/components/smartly/Button";
import StatePage from "@/components/smartly/StatePage";
import { getLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

// Outside any dashboard shell: a URL no route matches at all. "/" sends a
// signed-in visitor to their own home and everyone else to the sign-in page.
export default async function RootNotFound() {
  const locale = await getLocale();
  const t = (key: string) => translate(locale, key);

  return (
    <StatePage
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
  );
}
