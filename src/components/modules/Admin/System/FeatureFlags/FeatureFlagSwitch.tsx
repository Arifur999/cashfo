"use client";

import { updateFeatureFlagAction } from "@/app/(dashboardLayout)/admin/system/feature-flags/_action";
import InlineSwitch from "@/components/shared/form/InlineSwitch";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { IFeatureFlag } from "@/types/featureFlag.types";

// The master on/off switch; rollout and targeting only apply while it's on.
const FeatureFlagSwitch = ({ flag }: { flag: IFeatureFlag }) => {
  const { run } = useActionMutation({
    action: (isEnabled: boolean) => updateFeatureFlagAction(flag.id, { isEnabled }),
    successMessage: (updated) => `${updated.name} ${updated.isEnabled ? "enabled" : "disabled"}`,
    invalidateKeys: [queryKeys.featureFlags.all],
    refreshRoute: false,
  });

  return <InlineSwitch checked={flag.isEnabled} onChange={run} ariaLabel={`Enable ${flag.name}`} />;
};

export default FeatureFlagSwitch;
