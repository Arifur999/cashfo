"use client";

import { Eye, Lock, type LucideIcon, MapPin, ShieldAlert, UserRoundSearch } from "lucide-react";
import Link from "next/link";
import { updateFlagStatusAction } from "@/app/(dashboardLayout)/admin/security/(sections)/flags/_action";
import { Button } from "@/components/ui/button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatRecentDateTime } from "@/lib/date";
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

const SMALL_BUTTON = "h-8 rounded-md px-3 text-small font-semibold whitespace-nowrap";

// One flag as the design draws it: a severity stripe and icon, what was
// seen and when, the network and who is on it, and -- while it is open --
// "False alarm" beside the next step. A closed card fades and says who
// closed it.
const FlagCard = ({ flag }: { flag: ISecurityFlag }) => {
  const open = isOpenFlag(flag);
  const severity = SEVERITY_META[flag.severity];
  const Icon = TYPE_ICON[flag.type];
  const next = flagNextStep(flag);
  const tries = flagTriesLink(flag);
  const details = flagDetails(flag);
  const closedBy = flagClosedBy(flag);

  const { run, isPending } = useActionMutation({
    action: (status: FlagStatus) => updateFlagStatusAction(flag.id, { status }),
    successMessage: (updated) => DONE_MESSAGE[updated.status],
    invalidateKeys: [queryKeys.securityFlags.all, queryKeys.auditLogs.all],
    refreshRoute: false,
  });

  return (
    <article
      className={cn(
        "grid grid-cols-[44px_minmax(0,1fr)] items-start gap-4 rounded-lg border border-l-4 border-line bg-surface px-5 py-4 shadow-card sm:grid-cols-[44px_minmax(0,1fr)_auto]",
        open ? severity.stripe : "border-l-line opacity-75",
      )}
    >
      <span className={cn("flex size-11 items-center justify-center rounded-lg", severity.tile)}>
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-2 py-px text-caption font-bold tracking-wide", severity.chip)}>{flag.severity}</span>
          <b className="text-body font-semibold text-ink">{FLAG_TYPE_LABEL[flag.type]}</b>
          <span className="text-small text-ink-muted">· {formatRecentDateTime(flag.createdAt)}</span>
        </span>
        <p className="text-body leading-normal text-ink">{flag.description}</p>
        {(details || tries) && (
          <span className="flex flex-wrap gap-2 text-small text-ink-muted">
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
        <span className={cn("rounded-full px-2 py-0.5 text-caption font-semibold whitespace-nowrap", FLAG_STATUS_CHIP[flag.status])}>{FLAG_STATUS_LABEL[flag.status]}</span>
        {open && next && (
          <span className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              className={cn(SMALL_BUTTON, "border-line-strong bg-surface text-ink hover:bg-cream")}
              onClick={() => void run("FALSE_POSITIVE")}
            >
              False alarm
            </Button>
            <Button type="button" size="sm" disabled={isPending} className={SMALL_BUTTON} onClick={() => void run(next.status)}>
              {next.label}
            </Button>
          </span>
        )}
        {closedBy && <span className="text-caption whitespace-nowrap text-ink-muted">{closedBy}</span>}
      </div>
    </article>
  );
};

export default FlagCard;
