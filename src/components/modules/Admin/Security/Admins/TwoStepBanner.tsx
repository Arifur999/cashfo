"use client";

import { ShieldCheck, ShieldHalf } from "lucide-react";
import { useState } from "react";
import { setAdminTwoStepRequiredAction } from "@/app/(dashboardLayout)/admin/security/(sections)/admins/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

interface TwoStepBannerProps {
  // How many admins who can sign in use two-step, of how many.
  using: number;
  total: number;
  // Settings' adminTwoStepRequired; undefined until the settings load.
  required: boolean | undefined;
}

// Over the team: an amber warning while some admins sign in with a password
// alone, with "Require it for everyone"; once required, a quiet note that
// says who still has to set it up, and the way back. Nothing while every
// admin uses it by choice.
const TwoStepBanner = ({ using, total, required }: TwoStepBannerProps) => {
  const { translate, locale } = useLocale();
  const [confirming, setConfirming] = useState(false);
  const change = useActionMutation({
    action: setAdminTwoStepRequiredAction,
    successMessage: (settings) => (settings.adminTwoStepRequired ? "Every admin now needs two-step sign-in" : "Two-step sign-in is optional again"),
    invalidateKeys: [queryKeys.settings.all],
    refreshRoute: false,
  });

  if (required === undefined || (!required && using >= total)) return null;
  const missing = total - using;
  const values = { using: formatCount(using, locale), total: formatCount(total, locale), count: formatCount(missing, locale) };

  return (
    <>
      <div
        role="note"
        className={cn(
          "flex flex-col gap-3 rounded-field border px-4 py-3 text-body sm:flex-row sm:items-center",
          required ? "border-mint-200 bg-mint-50 text-brand-ink" : "border-warning-line bg-warning-50 text-warning-ink",
        )}
      >
        <span className="flex grow items-start gap-3 sm:items-center">
          {required ? (
            <ShieldCheck className="size-5 shrink-0 text-emerald" aria-hidden="true" />
          ) : (
            <ShieldHalf className="size-5 shrink-0 text-warning" aria-hidden="true" />
          )}
          <span>
            {required ? (
              <>
                <b className="font-semibold">
                  <T>Every admin must use two-step sign-in.</T>
                </b>{" "}
                {missing > 0 ? (
                  <T values={values}>{missing === 1 ? "{count} admin sets it up at their next sign-in." : "{count} admins set it up at their next sign-in."}</T>
                ) : (
                  <T>All of them have it on.</T>
                )}
              </>
            ) : (
              <>
                <b className="font-semibold">
                  <T values={values}>{"Only {using} of {total} admins use two-step sign-in."}</T>
                </b>{" "}
                <T>One stolen password could open the whole panel.</T>
              </>
            )}
          </span>
        </span>
        <Button
          variant="secondary"
          size="sm"
          className={cn("h-8.5 self-start text-small sm:self-auto", !required && "border-warning-fill text-warning-ink")}
          onClick={() => setConfirming(true)}
        >
          <T>{required ? "Stop requiring it" : "Require it for everyone"}</T>
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={required ? "Stop requiring two-step sign-in?" : "Require two-step sign-in for every admin?"}
        description={translate(
          required
            ? "Admins who use it keep it. Anyone can turn theirs off in My account, and new admins can skip it."
            : "Admins without it set it up at their next sign-in, before they get in. Nobody can turn theirs off while this is on.",
        )}
        confirmLabel={required ? "Stop requiring it" : "Require it"}
        pendingLabel="Saving..."
        isPending={change.isPending}
        onConfirm={async () => {
          if (await change.run({ adminTwoStepRequired: !required })) setConfirming(false);
        }}
      />
    </>
  );
};

export default TwoStepBanner;
