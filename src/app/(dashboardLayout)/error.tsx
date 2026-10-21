"use client";

import { CircleAlert, House, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { reportErrorAction } from "@/app/-actions/reportErrorAction";
import Button from "@/components/smartly/Button";
import StatePage from "@/components/smartly/StatePage";
import { ADMIN_HOME_ROUTE } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  // Next 16.3+: re-renders the segment and re-fetches its data.
  retry: () => void;
}

// A page inside the dashboard threw. The shell (sidebar, navbar) stays up;
// only the content area is replaced, in the words the site's other error
// pages use, and the crash is logged to System > Error Logs as an
// ADMIN_FRONTEND error. The shell's main already pads the content area, so
// the page adds none of its own.
export default function DashboardError({ error, retry }: DashboardErrorProps) {
  const { translate, locale } = useLocale();

  useEffect(() => {
    void reportErrorAction({ message: error.message || "Unknown error", stackTrace: error.stack });
  }, [error]);

  return (
    <StatePage
      standalone={false}
      locale={locale}
      className="p-0 md:p-0"
      icon={<CircleAlert />}
      tone="expense"
      reference={error.digest ? translate("Error reference: {digest}", { digest: error.digest }) : undefined}
      title={translate("Something went wrong on our side")}
      // Errors raised in the browser carry no reference, so only ask for one
      // when there is one to send.
      description={translate(
        error.digest
          ? "Nothing you entered was lost. Try again in a moment; if it keeps happening, send us the reference above and we will look into it."
          : "Try again in a moment; if it keeps happening, tell us what you were doing.",
      )}
      actions={
        <>
          <Button size="lg" onClick={() => retry()}>
            <RefreshCw />
            {translate("Try again")}
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href={ADMIN_HOME_ROUTE}>
              <House />
              {translate("Back to dashboard")}
            </Link>
          </Button>
        </>
      }
    />
  );
}
