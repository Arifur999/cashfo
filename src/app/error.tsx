"use client";

import { CircleAlert, House, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import Button from "@/components/smartly/Button";
import StatePage from "@/components/smartly/StatePage";
import { BRAND_NAME } from "@/lib/brand";
import { fillNodes, fillText } from "@/lib/i18n/fill";
import { LOCALE_COOKIE } from "@/lib/i18n/localeCookie";
import { translate, type Locale } from "@/lib/i18n/translate";

// No LocaleProvider out here (the layout that holds one is what failed), so
// the language comes from the cookie directly. The server renders English;
// a Bangla reader's page switches right after hydration.
const subscribe = () => () => {};
const readLocale = (): Locale => (document.cookie.split("; ").includes(`${LOCALE_COOKIE}=bn`) ? "bn" : "en");

// Catches what the segments' own error.tsx can't: a failure in a layout
// itself -- typically the API being unreachable while the admin panel or the
// customer app loads the signed-in account. Both reach it, so it names
// neither. Next 16.3: `retry`, not `reset`.
export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const locale = useSyncExternalStore<Locale>(subscribe, readLocale, () => "en");
  const t = (key: string) => translate(locale, key);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    // The skip link's target and the page's main landmark, in the page's
    // language with its face (no LocaleProvider to add them).
    <StatePage
      main
      locale={locale}
      homeLabel={fillText(t("{brand} home"), { brand: BRAND_NAME })}
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
      // Errors raised in the browser carry no reference, so only ask for
      // one when there is one to send.
      description={t(
        error.digest
          ? "Nothing you entered was lost. Try again in a moment; if it keeps happening, send us the reference above and we will look into it."
          : "Try again in a moment; if it keeps happening, tell us what you were doing.",
      )}
      actions={
        <>
          <Button size="xl" onClick={() => retry()}>
            <RefreshCw />
            {t("Try again")}
          </Button>
          <Button size="xl" variant="secondary" asChild>
            <Link href="/">
              <House />
              {t("Go to Home")}
            </Link>
          </Button>
        </>
      }
    >
      {/* The admin panel lands here too, so nothing customer-only. */}
      <span className="text-small text-ink-muted">{t("Anything already saved stays saved.")}</span>
    </StatePage>
  );
}
