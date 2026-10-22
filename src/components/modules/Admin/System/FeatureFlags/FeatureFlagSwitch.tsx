"use client";

import { useState } from "react";
import { updateFeatureFlagAction } from "@/app/(dashboardLayout)/admin/system/feature-flags/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import InlineSwitch from "@/components/shared/form/InlineSwitch";
import { Switch } from "@/components/ui/switch";
import { useActionMutation } from "@/hooks/useActionMutation";
import { rolloutLabel } from "@/lib/featureFlags";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import type { IFeatureFlag } from "@/types/featureFlag.types";

const SWITCH = "data-checked:bg-emerald data-unchecked:bg-line-strong";

// The master on/off switch; rollout and targeting only apply while it's on.
// A flag the app reads changes it for every customer in its rollout at
// once, so that switch asks first and says what it changes. A key nothing
// reads yet changes nothing, so it flips straight away.
// `targets` are the plans it is limited to, as the Plans column names them,
// so the confirm says who it reaches on both counts.
const FeatureFlagSwitch = ({ flag, targets }: { flag: IFeatureFlag; targets: string[] }) => {
  const { translate, locale } = useLocale();
  // The position asked for, while the dialog waits for a yes.
  const [asked, setAsked] = useState<boolean | null>(null);
  const { run, isPending } = useActionMutation({
    action: (isEnabled: boolean) => updateFeatureFlagAction(flag.id, { isEnabled }),
    successMessage: (updated) => translate(updated.isEnabled ? "{name} switched on" : "{name} switched off", { name: updated.name }),
    invalidateKeys: [queryKeys.featureFlags.all],
    refreshRoute: false,
  });
  const ariaLabel = translate(flag.isEnabled ? "Turn {key} off" : "Turn {key} on", { key: flag.key });

  if (!flag.usedFor) {
    return <InlineSwitch checked={flag.isEnabled} onChange={run} ariaLabel={ariaLabel} className={SWITCH} />;
  }

  const turningOn = asked === true;
  // Who it reaches: everyone in its rollout gets it on, or loses it off.
  const audience = rolloutLabel({ isEnabled: true, rolloutPercent: flag.rolloutPercent }, translate, locale);

  return (
    <>
      <Switch checked={asked ?? flag.isEnabled} disabled={isPending} aria-label={ariaLabel} aria-busy={isPending} className={SWITCH} onCheckedChange={setAsked} />
      <ConfirmDialog
        open={asked !== null}
        onOpenChange={(open) => {
          if (!open) setAsked(null);
        }}
        title={translate(turningOn ? "Turn {name} on?" : "Turn {name} off?", { name: flag.name })}
        description={turningOn ? "Customers in its rollout get this straight away." : "Customers lose this straight away."}
        confirmLabel={turningOn ? "Turn on" : "Turn off"}
        pendingLabel={turningOn ? "Turning on..." : "Turning off..."}
        isPending={isPending}
        onConfirm={async () => {
          if (asked !== null && (await run(asked))) setAsked(null);
        }}
      >
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-md border border-line bg-strip px-4 py-3 text-small">
          <dt className="text-ink-muted">{translate("What it does")}</dt>
          <dd className="text-ink">{translate(flag.usedFor)}</dd>
          <dt className="text-ink-muted">{translate(turningOn ? "Who gets it" : "Who has it now")}</dt>
          <dd className="text-ink">{audience}</dd>
          <dt className="text-ink-muted">{translate("Plans")}</dt>
          <dd className="text-ink">{targets.map((name) => (name === "All plans" || name === "Removed plan" ? translate(name) : name)).join(", ")}</dd>
        </dl>
      </ConfirmDialog>
    </>
  );
};

export default FeatureFlagSwitch;
