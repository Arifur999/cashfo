"use client";

import { useQuery } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import { useState } from "react";
import { updateSettingsAction } from "@/app/(dashboardLayout)/admin/settings/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ErrorState from "@/components/smartly/ErrorState";
import { Textarea } from "@/components/ui/textarea";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { platformSettingsQuery } from "@/queries/settings.queries";
import type { IUpdatePlatformSettingsPayload } from "@/types/settings.types";

// Maintenance mode from the System page: the same setting as in Settings.
// While it is on, customers see the message (in English or Bangla, as they
// use the app) and can't use the app; admins can still sign in. Until the
// setting has loaded the card claims neither On nor Off.
// The board's 10px fields with 13px words.
const FIELD = "min-h-0 resize-none rounded-field border-input bg-surface px-2.5 py-2 text-small leading-[1.45]";

const MaintenanceCard = () => {
  const { translate } = useLocale();
  const settingsQuery = useQuery(platformSettingsQuery());
  const settings = settingsQuery.data?.data;
  const [draft, setDraft] = useState<string | null>(null);
  const [draftBn, setDraftBn] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // undefined until the setting is known: never a guessed "Off".
  const on = settings?.maintenanceMode;
  const saved = settings?.maintenanceMessage ?? "";
  const message = draft ?? saved;
  const savedBn = settings?.maintenanceMessageBn ?? "";
  const messageBn = draftBn ?? savedBn;
  // A changed message can be saved on its own, on or off, so a draft
  // written ahead of time isn't lost.
  const edited = settings !== undefined && ((draft !== null && draft.trim() !== saved) || (draftBn !== null && draftBn.trim() !== savedBn));
  const messages = { maintenanceMessage: message.trim(), maintenanceMessageBn: messageBn.trim() };
  const clearDrafts = () => {
    setDraft(null);
    setDraftBn(null);
  };

  const mode = useActionMutation({
    action: (values: IUpdatePlatformSettingsPayload) => updateSettingsAction(values),
    successMessage: (updated) => (updated.maintenanceMode ? "Maintenance is on, customers see the message" : "Maintenance is off"),
    invalidateKeys: [queryKeys.settings.all],
    refreshRoute: false,
  });
  const messageSave = useActionMutation({
    action: (values: IUpdatePlatformSettingsPayload) => updateSettingsAction(values),
    successMessage: "Message saved",
    invalidateKeys: [queryKeys.settings.all],
    refreshRoute: false,
  });
  const isPending = mode.isPending || messageSave.isPending;

  const saveMessage = async () => {
    if (await messageSave.run(messages)) clearDrafts();
  };

  return (
    <Card className="flex flex-col gap-3 px-4.5 py-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-field bg-warning-soft text-warning">
          <Wrench aria-hidden="true" className="size-4.5" />
        </span>
        <h2 className="grow text-title text-ink">
          <T>Maintenance mode</T>
        </h2>
        <span className={cn("rounded-full px-2.25 py-0.5 text-caption font-semibold", on ? "bg-warning-soft text-warning" : "bg-surface-sunken text-ink-2")}>
          <T>{on === undefined ? "Unknown" : on ? "On" : "Off"}</T>
        </span>
      </div>
      <p className="text-small leading-normal text-ink-soft">
        <T>While it&apos;s on, customers see this message and can&apos;t use the app. Admins can still sign in here.</T>
      </p>
      <label className="flex flex-col gap-1.25">
        <span className="text-[12.5px] font-medium text-ink">
          <T>Message in English</T>
        </span>
        <Textarea
          rows={2}
          lang="en"
          value={message}
          disabled={settings === undefined}
          onChange={(event) => setDraft(event.target.value)}
          className={FIELD}
        />
      </label>
      <label className="flex flex-col gap-1.25">
        <span className="text-[12.5px] font-medium text-ink">
          <T>Message in Bangla</T>
        </span>
        <Textarea
          rows={2}
          lang="bn"
          value={messageBn}
          disabled={settings === undefined}
          placeholder={translate("Empty: the app's own Bangla notice")}
          onChange={(event) => setDraftBn(event.target.value)}
          className={cn(FIELD, "text-body")}
        />
      </label>
      {/* The visible reason the buttons are off: the setting didn't load. */}
      {settingsQuery.isError && !settings && (
        <ErrorState
          bordered={false}
          className="rounded-md bg-strip p-4"
          title={translate("Couldn't load the maintenance setting")}
          onRetry={() => void settingsQuery.refetch()}
        />
      )}
      <div className="flex flex-wrap gap-2">
        {on ? (
          <Button variant="secondary" disabled={isPending} className="h-9.5 grow text-[13.5px]" onClick={() => void mode.run({ maintenanceMode: false })}>
            <T>Turn off maintenance</T>
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={isPending || on === undefined}
            className="h-9.5 grow border-warning-fill text-[13.5px] text-warning-ink hover:bg-warning-soft"
            onClick={() => setConfirming(true)}
          >
            <T>Turn on maintenance</T>
          </Button>
        )}
        {edited && (
          <Button variant="action" disabled={isPending} className="h-9.5 text-[13.5px]" onClick={() => void saveMessage()}>
            <T>Save message</T>
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
        isPending={mode.isPending}
        onConfirm={async () => {
          // Stays open on a failed save, so nothing looks done that wasn't.
          if (await mode.run({ maintenanceMode: true, ...messages })) {
            clearDrafts();
            setConfirming(false);
          }
        }}
      >
        {/* What customers will actually read. */}
        {message.trim() ? (
          <figure className="flex flex-col gap-1 rounded-md border border-line bg-strip px-4 py-3">
            <figcaption className="text-caption font-semibold text-ink-muted">
              <T>What customers will read</T>
            </figcaption>
            <blockquote lang="en" className="text-small leading-normal whitespace-pre-line text-ink-2">
              {message.trim()}
            </blockquote>
            {messageBn.trim() && (
              <blockquote lang="bn" className="text-small leading-normal whitespace-pre-line text-ink-2">
                {messageBn.trim()}
              </blockquote>
            )}
          </figure>
        ) : (
          <p className="rounded-md border border-line bg-strip px-4 py-3 text-small text-ink-2">
            <T>Customers will see the standard notice, with no message from the team.</T>
          </p>
        )}
      </ConfirmDialog>
    </Card>
  );
};

export default MaintenanceCard;
