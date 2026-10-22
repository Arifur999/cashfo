"use client";

import { CircleAlert, House, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { reportClientError } from "@/components/modules/Auth/reportClientError";
import Button from "@/components/smartly/Button";
import StatePage from "@/components/smartly/StatePage";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Settings › Help & support (lib/customer/nav.ts).
const HELP_ROUTE = "/settings/help";

interface CustomerErrorProps {
  error: Error & { digest?: string };
  // Next 16.3+: re-renders the segment and re-fetches its data.
  retry: () => void;
}

// A customer page couldn't load -- most often the API was unreachable (see
// lib/customer/readFallback.ts). The sidebar and top bar stay up; the content
// area says what the full-page error does, with its reference and buttons,
// and where to ask for help. The crash goes to the API's error log too
// (POST /api/client-errors), as the admin panel's does; that call never
// throws, so a failed report changes nothing here.
export default function CustomerError({ error, retry }: CustomerErrorProps) {
  const { locale, t } = useLocale();

  useEffect(() => {
    void reportClientError({ message: error.message, digest: error.digest, path: window.location.pathname });
  }, [error]);

  return (
    <StatePage
      standalone={false}
      locale={locale}
      icon={<CircleAlert />}
      tone="expense"
      // The words in the page's face (the mono one has no Bangla), the
      // reference itself still mono.
      reference={
        error.digest ? (
          <span className={locale === "bn" ? "font-bn" : undefined}>{fillNodes(t("Error reference: {digest}"), { digest: <span className="font-mono">{error.digest}</span> })}</span>
        ) : undefined
      }
      title={t("Something went wrong on our side")}
      // Errors raised in the browser carry no reference, so only ask for one
      // when there is one to send.
      description={t(
        error.digest
          ? "Nothing you entered was lost. Try again in a moment; if it keeps happening, send us the reference above and we will look into it."
          : "Try again in a moment; if it keeps happening, tell us what you were doing.",
      )}
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
      <Link href={HELP_ROUTE} className="inline-flex min-h-11 items-center rounded-sm text-body font-semibold text-emerald hover:text-emerald-hover hover:underline">
        {t("Contact support")}
      </Link>
    </StatePage>
  );
}
