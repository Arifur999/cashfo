"use client";

import { Radar } from "lucide-react";
import { runDetectionAction } from "@/app/(dashboardLayout)/admin/security/(sections)/flags/_action";
import Loader from "@/components/shared/Loader";
import { Button } from "@/components/ui/button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { pluralize } from "@/lib/text";
import { queryKeys } from "@/lib/queryKeys";
import type { IDetectionRunResult } from "@/types/securityFlag.types";

const describeRun = ({ scanned, flagsCreated }: IDetectionRunResult) =>
  flagsCreated > 0
    ? `Scanned ${pluralize(scanned, "failed sign-in")} and raised ${pluralize(flagsCreated, "new flag")}`
    : `Scanned ${pluralize(scanned, "failed sign-in")} -- nothing new to flag`;

// Runs the failed-login scan on demand (normally a scheduled job's work).
const RunDetectionButton = () => {
  const { run, isPending } = useActionMutation({
    action: () => runDetectionAction(),
    successMessage: describeRun,
    invalidateKeys: [queryKeys.securityFlags.all],
    refreshRoute: false,
  });

  return (
    <Button size="sm" className="h-8" disabled={isPending} onClick={() => void run(undefined)}>
      {isPending ? <Loader size={14} onDark label="Scanning..." /> : <Radar aria-hidden="true" />}
      {isPending ? "Scanning..." : "Run detection"}
    </Button>
  );
};

export default RunDetectionButton;
