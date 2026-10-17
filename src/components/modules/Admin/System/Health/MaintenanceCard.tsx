"use client";

import { useQuery } from "@tanstack/react-query";
import { Construction } from "lucide-react";
import { useState } from "react";
import { updateSettingsAction } from "@/app/(dashboardLayout)/admin/settings/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import Card from "@/components/smartly/Card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { platformSettingsQuery } from "@/queries/settings.queries";
import type { IUpdatePlatformSettingsPayload } from "@/types/settings.types";
import T from "@/components/shared/T";

const OUTLINE = "h-9.5 border-line-strong bg-surface font-semibold text-ink hover:bg-cream";

// Maintenance mode from the System page: the same setting as in Settings.
// While it is on, customers see the message and can't use the app; admins
// can still sign in. One message for now -- a Bangla one is a NEW item in
// the design notes.
const MaintenanceCard = () => {
  const settings = useQuery(platformSettingsQuery()).data?.data;
  const [draft, setDraft] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const on = settings?.maintenanceMode ?? false;
  const message = draft ?? settings?.maintenanceMessage ?? "";
  const edited = draft !== null && draft.trim() !== (settings?.maintenanceMessage ?? "");

  const { run, isPending } = useActionMutation({
    action: (values: IUpdatePlatformSettingsPayload) => updateSettingsAction(values),
    successMessage: (updated) => (updated.maintenanceMode ? "Maintenance is on, customers see the message" : "Maintenance is off"),
    invalidateKeys: [queryKeys.settings.all],
    refreshRoute: false,
  });
  const save = async (values: IUpdatePlatformSettingsPayload) => {
    if (await run(values)) setDraft(null);
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-warning-soft text-warning">
          <Construction aria-hidden="true" className="size-4.5" />
        </span>
        <h2 className="grow text-title text-ink"><T>Maintenance mode</T></h2>
        <span className={cn("rounded-full px-2 py-0.5 text-caption font-semibold", on ? "bg-warning-soft text-warning" : "bg-surface-sunken text-ink-2")}><T>{on ? "On" : "Off"}</T></span>
      </div>
      <p className="text-small leading-normal text-ink-2"><T>While it&apos;s on, customers see this message and can&apos;t use the app. Admins can still sign in here.</T></p>
      <label className="flex flex-col gap-1">
        <span className="text-small font-medium text-ink"><T>Message</T></span>
        <Textarea
          rows={2}
          value={message}
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-0 resize-none rounded-md border-line-strong bg-surface px-3 py-2 text-small leading-normal"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {on ? (
          <>
            <Button type="button" variant="outline" disabled={isPending} className={cn(OUTLINE, "grow")} onClick={() => void save({ maintenanceMode: false })}>
              <T>Turn off maintenance</T>
            </Button>
            {edited && (
              <Button type="button" disabled={isPending} className="h-9.5 font-semibold" onClick={() => void save({ maintenanceMessage: message.trim() })}>
                <T>Save message</T>
              </Button>
            )}
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={isPending || !settings}
            className={cn(OUTLINE, "grow border-warning-fill text-warning hover:bg-warning-soft")}
            onClick={() => setConfirming(true)}
          >
            <T>Turn on maintenance</T>
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Turn on maintenance?"
        description="Customers see this message and can't use the app until you turn it off. Admins can still sign in."
        confirmLabel="Turn on"
        pendingLabel="Turning on..."
        isPending={isPending}
        onConfirm={async () => {
          await save({ maintenanceMode: true, maintenanceMessage: message.trim() });
          setConfirming(false);
        }}
      />
    </Card>
  );
};

export default MaintenanceCard;
