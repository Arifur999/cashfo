"use client";

import { updateFlagStatusAction } from "@/app/(dashboardLayout)/admin/security/(sections)/flags/_action";
import InlineStatusSelect from "@/components/shared/form/InlineStatusSelect";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import { humanizeEnum } from "@/lib/statusBadge";
import type { FlagStatus, ISecurityFlag } from "@/types/securityFlag.types";
import { FLAG_STATUS_OPTIONS } from "./flagOptions";

// Reviewing a flag records who changed it and when (shown in the row).
const FlagStatusSelect = ({ flag }: { flag: ISecurityFlag }) => {
  const { run } = useActionMutation({
    action: (status: FlagStatus) => updateFlagStatusAction(flag.id, { status }),
    successMessage: (updated) => `Flag marked ${humanizeEnum(updated.status).toLowerCase()}`,
    invalidateKeys: [queryKeys.securityFlags.all],
    refreshRoute: false,
  });

  return <InlineStatusSelect ariaLabel={`Status of flag: ${flag.description}`} value={flag.status} options={FLAG_STATUS_OPTIONS} onChange={run} />;
};

export default FlagStatusSelect;
