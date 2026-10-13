"use client";

import { ServerCrash } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      <ServerCrash className="size-10 text-destructive" aria-hidden="true" />
      <h1 className="text-lg font-semibold text-foreground">{t("Something went wrong")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t("The server may be temporarily unavailable. Please try again in a moment.")}</p>
      <Button onClick={() => retry()} className="mt-2">
        {t("Try again")}
      </Button>
    </div>
  );
}
