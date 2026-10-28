"use client";

import { LogOut, Monitor, Smartphone } from "lucide-react";
import { useState } from "react";
import { signOutOwnerEverywhereAction } from "@/app/(dashboardLayout)/admin/users/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import Button from "@/components/smartly/Button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatRelativeDateTime } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import type { IOwnerDevice } from "@/types/owner.types";
import { isPhoneDevice } from "./peopleDisplay";

interface OwnerDevicesCardProps {
  userId: string;
  name: string;
  devices: IOwnerDevice[];
  // MANAGE_ROLES ownerStatus: the roles that suspend can sign them out.
  canSignOut: boolean;
  // How many rows the card shows; the Activity tab shows them all.
  limit?: number;
}

// "Sign-ins and devices" on a person's page (AdminUserDetail): each device
// with where it was and when it was last used ("Active now" while signed
// in), and "Sign out of all devices" for the roles that may.
export function OwnerDevicesCard({ userId, name, devices, canSignOut, limit }: OwnerDevicesCardProps) {
  const { translate, locale } = useLocale();
  const [confirming, setConfirming] = useState(false);
  const { run, isPending } = useActionMutation({
    action: () => signOutOwnerEverywhereAction(userId),
    successMessage: (result: { signedOut: number }) =>
      result.signedOut > 0 ? plural(translate, result.signedOut, "Signed out of {count} device", "Signed out of {count} devices", undefined, locale) : translate("No device was signed in"),
    invalidateKeys: [queryKeys.owners.all],
  });
  const signedIn = devices.filter((device) => device.signedIn).length;
  const shown = limit === undefined ? devices : devices.slice(0, limit);

  return (
    <section aria-labelledby="owner-devices" className="overflow-clip rounded-card border border-line-card bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4.5 py-3.5">
        <h2 id="owner-devices" className="text-title text-ink">
          {translate("Sign-ins and devices")}
        </h2>
        {canSignOut && signedIn > 0 && (
          <Button variant="secondary" size="sm" className="h-8.5 px-3.5 pointer-coarse:h-11" onClick={() => setConfirming(true)}>
            <LogOut className="size-3.5 text-ink-2" strokeWidth={2} aria-hidden="true" />
            {translate("Sign out of all devices")}
          </Button>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="border-t border-divider px-4.5 py-4 text-small text-ink-muted">{translate("They haven't signed in on any device yet.")}</p>
      ) : (
        <ul>
          {shown.map((device) => {
            const Icon = isPhoneDevice(device.deviceLabel) ? Smartphone : Monitor;
            return (
              <li key={device.id} className="flex items-center gap-3 border-t border-divider px-4.5 py-3">
                <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-field bg-surface-sunken text-ink-2">
                  <Icon className="size-4.5" strokeWidth={2} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-body font-semibold text-ink">{device.deviceLabel ?? translate("Unknown device")}</span>
                  <span className="truncate text-[12.5px] leading-[normal] text-ink-muted tabular-nums">{[device.place, device.ipAddress].filter(Boolean).join(" · ") || "—"}</span>
                </span>
                <span className={cn("shrink-0 text-right text-[12.5px] leading-[normal] font-semibold", device.signedIn ? "text-emerald" : "text-ink-muted")}>
                  {device.signedIn ? translate("Active now") : formatRelativeDateTime(device.lastUsedAt ?? device.createdAt, { t: translate, locale })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        icon={LogOut}
        title={translate("Sign {name} out of every device?", { name })}
        description={plural(
          translate,
          signedIn,
          "{count} device is signed in. They stay able to sign in again with their password.",
          "{count} devices are signed in. They stay able to sign in again with their password.",
          undefined,
          locale,
        )}
        confirmLabel="Sign out of all devices"
        pendingLabel="Signing out..."
        isPending={isPending}
        onConfirm={async () => {
          if (await run(undefined)) setConfirming(false);
        }}
      />
    </section>
  );
}
