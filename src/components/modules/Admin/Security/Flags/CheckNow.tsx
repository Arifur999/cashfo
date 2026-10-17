"use client";

import { useQuery } from "@tanstack/react-query";
import { runDetectionAction } from "@/app/(dashboardLayout)/admin/security/(sections)/flags/_action";
import { Button } from "@/components/ui/button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatLogTime } from "@/lib/date";
import { queryKeys } from "@/lib/queryKeys";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural, type Translate } from "@/lib/i18n/message";
import { lowerFirst } from "@/lib/text";
import { securityFlagsSummaryQuery } from "@/queries/security.queries";
import type { IDetectionRunResult } from "@/types/securityFlag.types";
import T from "@/components/shared/T";

const describeCheck = ({ scanned, flagsCreated }: IDetectionRunResult, t: Translate) => {
  const checked = plural(t, scanned, "{count} failed sign-in", "{count} failed sign-ins");
  return flagsCreated > 0
    ? t("Checked {checked} and raised {flags}", { checked, flags: plural(t, flagsCreated, "{count} new flag", "{count} new flags") })
    : t("Checked {checked}, nothing new to flag", { checked });
};

// "Last checked 2:48 pm" and "Check now": looks over the last 15 minutes of
// failed sign-ins on demand. Each check is written to the audit log.
const CheckNow = () => {
  const { translate } = useLocale();
  const lastCheckedAt = useQuery(securityFlagsSummaryQuery()).data?.data.lastCheckedAt;
  const { run, isPending } = useActionMutation({
    action: () => runDetectionAction(),
    successMessage: (result) => describeCheck(result, translate),
    invalidateKeys: [queryKeys.securityFlags.all, queryKeys.auditLogs.all],
    refreshRoute: false,
  });

  return (
    <span className="flex items-center gap-3">
      <span className="text-small text-ink-muted">{lastCheckedAt ? translate("Last checked {time}", { time: lowerFirst(formatLogTime(lastCheckedAt, { t: translate })) }) : translate("Never checked")}</span>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="border-line-strong bg-surface font-semibold text-ink hover:bg-cream"
        disabled={isPending}
        onClick={() => void run(undefined)}
      >
        <T>{isPending ? "Checking..." : "Check now"}</T>
      </Button>
    </span>
  );
};

export default CheckNow;
