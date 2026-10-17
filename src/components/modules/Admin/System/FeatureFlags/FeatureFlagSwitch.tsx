"use client";

import { updateFeatureFlagAction } from "@/app/(dashboardLayout)/admin/system/feature-flags/_action";
import InlineSwitch from "@/components/shared/form/InlineSwitch";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import type { IFeatureFlag } from "@/types/featureFlag.types";

// The master on/off switch; rollout and targeting only apply while it's on.
const FeatureFlagSwitch = ({ flag }: { flag: IFeatureFlag }) => {
  const { translate } = useLocale();
  const { run } = useActionMutation({
    action: (isEnabled: boolean) => updateFeatureFlagAction(flag.id, { isEnabled }),
    successMessage: (updated) => translate(updated.isEnabled ? "{name} switched on" : "{name} switched off", { name: updated.name }),
    invalidateKeys: [queryKeys.featureFlags.all],
    refreshRoute: false,
  });

  return (
    <InlineSwitch
      checked={flag.isEnabled}
      onChange={run}
      ariaLabel={translate(flag.isEnabled ? "Turn {key} off" : "Turn {key} on", { key: flag.key })}
      className="data-checked:bg-emerald data-unchecked:bg-line-strong"
    />
  );
};

export default FeatureFlagSwitch;
