"use client";

import { CircleAlert, House, RefreshCw } from "lucide-react";
import Link from "next/link";
import Button from "@/components/smartly/Button";
import StatePage from "@/components/smartly/StatePage";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface CustomerErrorProps {
  error: Error & { digest?: string };
  // Next 16.3+: re-renders the segment and re-fetches its data.
  retry: () => void;
}

// A customer page couldn't load -- most often the API was unreachable (see
// lib/customer/readFallback.ts). The sidebar and top bar stay up; the content
// area says what the full-page error does, with its reference and buttons.
export default function CustomerError({ error, retry }: CustomerErrorProps) {
  const { t } = useLocale();

  return (
    <StatePage
      standalone={false}
      icon={<CircleAlert />}
      tone="expense"
      reference={error.digest ? `${t("Error reference")}: ${error.digest}` : undefined}
      title={t("Something went wrong on our side")}
      description={t("Nothing you entered was lost. Try again in a moment; if it keeps happening, send us the reference above and we will look into it.")}
      actions={
        <>
          <Button size="lg" onClick={() => retry()}>
            <RefreshCw />
            {t("Try again")}
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href={CUSTOMER_HOME_ROUTE}>
              <House />
              {t("Go to Home")}
            </Link>
          </Button>
        </>
      }
    >
      <span className="text-small text-ink-muted">{t("Saved transactions stay saved. Anything you were typing may need to be entered again.")}</span>
    </StatePage>
  );
}
