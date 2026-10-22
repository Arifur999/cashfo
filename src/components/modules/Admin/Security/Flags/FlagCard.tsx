"use client";

import { Eye, Lock, type LucideIcon, MapPin, ShieldAlert, UserRoundSearch } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { updateFlagStatusAction } from "@/app/(dashboardLayout)/admin/security/(sections)/flags/_action";
import RelativeTime from "@/components/shared/RelativeTime";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { asStatus } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { FLAG_STATUS_CHIP, FLAG_STATUS_LABEL, FLAG_TYPE_LABEL, flagClosedBy, flagDetails, flagNextStep, flagTriesLink, isOpenFlag, SEVERITY_META } from "@/lib/securityFlags";
import { cn } from "@/lib/utils";
import type { FlagStatus, ISecurityFlag, SuspiciousActivityType } from "@/types/securityFlag.types";

const TYPE_ICON: Record<SuspiciousActivityType, LucideIcon> = {
  MULTIPLE_FAILED_LOGINS: Lock,
  UNUSUAL_LOGIN_LOCATION: MapPin,
  MASS_DATA_ACCESS: Eye,
  IMPERSONATION_SPIKE: UserRoundSearch,
  OTHER: ShieldAlert,
};

const DONE_MESSAGE: Record<FlagStatus, string> = {
  OPEN: "Flag opened again",
  REVIEWING: "Review started",
  RESOLVED: "Marked resolved",
  FALSE_POSITIVE: "Marked as a false alarm",
};

interface FlagCardProps {
  flag: ISecurityFlag;
  // After its status changed. The card may leave the board's view, so the
  // board decides where focus goes next.
  onChanged?: (flag: ISecurityFlag, status: FlagStatus) => void;
}

// One flag as the design draws it: a severity stripe and icon, what was
// seen and when, the network and who is on it, and -- while it is open --
// "False alarm" beside the next step. A closed card steps back onto the
// strip ground, says who closed it, and can be opened again.
const FlagCard = ({ flag, onChanged }: FlagCardProps) => {
  const open = isOpenFlag(flag);
  const severity = SEVERITY_META[flag.severity];
  const Icon = TYPE_ICON[flag.type];
  const next = flagNextStep(flag);
  const titleId = useId();
  const { translate, locale } = useLocale();
  const tries = flagTriesLink(flag, translate, { locale });
  const details = flagDetails(flag, { t: translate, locale });
  const closedBy = flagClosedBy(flag, { t: translate, locale });

  const { run, isPending } = useActionMutation({
    action: (status: FlagStatus) => updateFlagStatusAction(flag.id, { status }),
    successMessage: (updated) => DONE_MESSAGE[updated.status],
    invalidateKeys: [queryKeys.securityFlags.all, queryKeys.auditLogs.all],
    refreshRoute: false,
  });
  const change = async (status: FlagStatus) => {
    if (await run(status)) onChanged?.(flag, status);
  };

  return (
    <article
      data-flag-id={flag.id}
      tabIndex={-1}
      aria-labelledby={titleId}
      className={cn(
        "grid grid-cols-[44px_minmax(0,1fr)] items-start gap-4 rounded-lg border border-l-4 border-line px-5 py-4 shadow-card sm:grid-cols-[44px_minmax(0,1fr)_auto]",
        // Closed: the strip ground and a plain edge, never faded text.
        open ? cn("bg-surface", severity.stripe) : "border-l-line bg-strip",
      )}
    >
      <span className={cn("flex size-11 items-center justify-center rounded-lg", severity.tile)}>
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          {/* Letter-spacing suits the English capitals, not Bangla. */}
          <span className={cn("rounded-full px-2 py-px text-caption font-bold", locale === "en" && "tracking-wide", severity.chip)}>
            <T>{flag.severity}</T>
          </span>
          <b id={titleId} className="text-body font-semibold text-ink">
            <T>{FLAG_TYPE_LABEL[flag.type]}</T>
          </b>
          <span className="text-small text-ink-muted">
            · <RelativeTime value={flag.createdAt} as="recent" />
          </span>
        </span>
        {/* The API writes this sentence in English. */}
        <p lang="en" className="text-body leading-normal wrap-anywhere text-ink">
          {flag.description}
        </p>
        {(details || tries) && (
          <span className="flex flex-wrap gap-2 text-small wrap-anywhere text-ink-muted">
            {details && <span>{details}</span>}
            {tries && (
              <Link href={tries.href} className="font-semibold text-emerald hover:underline">
                {tries.label}
              </Link>
            )}
          </span>
        )}
      </div>
      <div className="col-span-2 flex flex-col items-start gap-2 sm:col-span-1 sm:items-end">
        <span className={cn("rounded-full px-2 py-0.5 text-caption font-semibold whitespace-nowrap", FLAG_STATUS_CHIP[flag.status])}>
          <T>{asStatus(FLAG_STATUS_LABEL[flag.status])}</T>
        </span>
        {open && next && (
          <span className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" disabled={isPending} onClick={() => void change("FALSE_POSITIVE")}>
              <T>False alarm</T>
            </Button>
            <Button variant="action" size="sm" disabled={isPending} onClick={() => void change(next.status)}>
              <T>{next.label}</T>
            </Button>
          </span>
        )}
        {!open && (
          // A mis-clicked "False alarm" is never final.
          <span className="flex flex-wrap items-center gap-2 sm:justify-end">
            {closedBy && <span className="text-caption text-ink-muted">{closedBy}</span>}
            <Button variant="secondary" size="sm" disabled={isPending} onClick={() => void change("OPEN")}>
              <T>Reopen</T>
            </Button>
          </span>
        )}
      </div>
    </article>
  );
};

export default FlagCard;
