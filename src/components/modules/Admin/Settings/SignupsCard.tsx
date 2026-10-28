"use client";

import { useId } from "react";
import { updateSettingsAction } from "@/app/(dashboardLayout)/admin/settings/_action";
import InlineSwitch from "@/components/shared/form/InlineSwitch";
import T from "@/components/shared/T";
import Card from "@/components/smartly/Card";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";

// "New sign-ups": off refuses new customer accounts (email and a first
// Google sign-in); people who have one still sign in. Saved as it is
// flipped; other roles see it locked.
const SignupsCard = ({ open, canManage }: { open: boolean; canManage: boolean }) => {
  const { translate } = useLocale();
  const titleId = useId();
  const { run } = useActionMutation({
    action: updateSettingsAction,
    successMessage: (settings) => (settings.signupsOpen ? "New sign-ups are open" : "New sign-ups are paused"),
    invalidateKeys: [queryKeys.settings.all],
    refreshRoute: false,
  });

  return (
    <Card asChild padding="none" className="flex items-center gap-3.5 px-5 py-4">
      <section aria-labelledby={titleId}>
        <span className="flex grow flex-col gap-0.75">
          <h2 id={titleId} className="text-[15px] font-semibold text-ink">
            <T>New sign-ups</T>
          </h2>
          <span className="text-small leading-normal text-ink-soft">
            <T>Turn this off to pause new accounts for a while. People who already have an account can still sign in.</T>
          </span>
        </span>
        {canManage ? (
          <InlineSwitch checked={open} ariaLabel={translate("Allow new sign-ups")} className="data-checked:bg-emerald" onChange={(next) => run({ signupsOpen: next })} />
        ) : (
          <span className="shrink-0 text-small font-semibold text-ink-2">
            <T>{open ? "On" : "Off"}</T>
          </span>
        )}
      </section>
    </Card>
  );
};

export default SignupsCard;
