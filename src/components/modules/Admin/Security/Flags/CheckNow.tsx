"use client";

import { useQuery } from "@tanstack/react-query";
import { runDetectionAction } from "@/app/(dashboardLayout)/admin/security/(sections)/flags/_action";
import { Button } from "@/components/ui/button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatLogTime } from "@/lib/date";
import { queryKeys } from "@/lib/queryKeys";
import { lowerFirst, pluralize } from "@/lib/text";
import { securityFlagsSummaryQuery } from "@/queries/security.queries";
import type { IDetectionRunResult } from "@/types/securityFlag.types";

const describeCheck = ({ scanned, flagsCreated }: IDetectionRunResult) =>
  flagsCreated > 0
    ? `Checked ${pluralize(scanned, "failed sign-in")} and raised ${pluralize(flagsCreated, "new flag")}`
    : `Checked ${pluralize(scanned, "failed sign-in")}, nothing new to flag`;

// "Last checked 2:48 pm" and "Check now": looks over the last 15 minutes of
// failed sign-ins on demand. Each check is written to the audit log.
const CheckNow = () => {
  const lastCheckedAt = useQuery(securityFlagsSummaryQuery()).data?.data.lastCheckedAt;
  const { run, isPending } = useActionMutation({
    action: () => runDetectionAction(),
    successMessage: describeCheck,
    invalidateKeys: [queryKeys.securityFlags.all, queryKeys.auditLogs.all],
    refreshRoute: false,
  });

  return (
    <span className="flex items-center gap-3">
      <span className="text-small text-ink-muted">{lastCheckedAt ? `Last checked ${lowerFirst(formatLogTime(lastCheckedAt))}` : "Never checked"}</span>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="border-line-strong bg-surface font-semibold text-ink hover:bg-cream"
        disabled={isPending}
        onClick={() => void run(undefined)}
      >
        {isPending ? "Checking..." : "Check now"}
      </Button>
    </span>
  );
};

export default CheckNow;
