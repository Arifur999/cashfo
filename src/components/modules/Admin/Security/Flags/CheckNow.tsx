"use client";

import { useQuery } from "@tanstack/react-query";
import { runDetectionAction } from "@/app/(dashboardLayout)/admin/security/(sections)/flags/_action";
import { RefreshCw } from "lucide-react";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatLogTime } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural, type Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
import { queryKeys } from "@/lib/queryKeys";
import { lowerFirst } from "@/lib/text";
import { cn } from "@/lib/utils";
import { securityFlagsSummaryQuery } from "@/queries/security.queries";
import type { IDetectionRunResult } from "@/types/securityFlag.types";

// What the check found, with its counts in the reader's digits.
const describeCheck = ({ scanned, flagsCreated }: IDetectionRunResult, t: Translate, locale: Locale) => {
  const checked = plural(t, scanned, "{count} failed sign-in", "{count} failed sign-ins", undefined, locale);
  return flagsCreated > 0
    ? t("Checked {checked} and raised {flags}", { checked, flags: plural(t, flagsCreated, "{count} new flag", "{count} new flags", undefined, locale) })
    : t("Checked {checked}, nothing new to flag", { checked });
};

// "Last checked 2:48 pm" and "Check now": looks over the last 15 minutes of
// failed sign-ins on demand. Each check is written to the audit log.
const CheckNow = () => {
  const { translate, locale } = useLocale();
  const lastCheckedAt = useQuery(securityFlagsSummaryQuery()).data?.data.lastCheckedAt;
  const { run, isPending } = useActionMutation({
    action: () => runDetectionAction(),
    successMessage: (result) => describeCheck(result, translate, locale),
    invalidateKeys: [queryKeys.securityFlags.all, queryKeys.auditLogs.all],
    refreshRoute: false,
  });

  return (
    <span className="flex items-center gap-3">
      <span className="text-[12.5px] text-ink-muted">{lastCheckedAt ? translate("Last checked {time}", { time: lowerFirst(formatLogTime(lastCheckedAt, { t: translate, locale })) }) : translate("Never checked")}</span>
      {/* The header's 40px, beside the other tabs' create buttons. */}
      <Button variant="secondary" disabled={isPending} onClick={() => void run(undefined)}>
        <RefreshCw aria-hidden="true" className={cn("text-ink-2", isPending && "animate-spin motion-reduce:animate-none")} />
        <T>{isPending ? "Checking..." : "Check now"}</T>
      </Button>
    </span>
  );
};

export default CheckNow;
