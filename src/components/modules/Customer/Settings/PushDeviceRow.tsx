"use client";

import { BellRing, RotateCw } from "lucide-react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { PushStatus } from "@/lib/push";

interface PushDeviceRowProps {
  // The server's VAPID key; null when push isn't set up there.
  publicKey: string | null;
  // A read-only "View as customer" session: nothing here may change.
  readOnly?: boolean;
}

// What the row says in each state.
const BODY: Record<PushStatus, string> = {
  loading: "Checking this device...",
  unsupported: "This browser can't show notifications. Reminders still appear in the bell.",
  "ios-install": "On iPhone and iPad, tap Share, then Add to Home Screen, and open Smartly from there to turn notifications on.",
  unavailable: "Notifications aren't available yet. Reminders still appear in the bell.",
  blocked: "Notifications are blocked for this site. Allow them in your browser's site settings (the icon beside the address), then check again.",
  off: "Get your reminders on this phone or computer, even when Smartly is closed.",
  on: "This device gets your reminders as notifications.",
};

// Settings › App › Reminders: "Notifications on this device" -- turning web
// push on (permission, the service worker, the subscription), a test, and
// turning it off; or why it can't be, and what to do about it.
export function PushDeviceRow({ publicKey, readOnly = false }: PushDeviceRowProps) {
  const { t } = useLocale();
  const push = usePushSubscription(publicKey);
  const { status, busy } = push;

  async function turnOn() {
    const outcome = await push.turnOn();
    if (outcome.ok) toast.success(t("Notifications are on for this device."));
    else if (outcome.message) toast.error(t(outcome.message));
  }

  async function turnOff() {
    const outcome = await push.turnOff();
    if (outcome.ok) toast.success(t("Notifications are off for this device."));
    else if (outcome.message) toast.error(t(outcome.message));
  }

  async function sendTest() {
    const outcome = await push.sendTest();
    if (!outcome.ok) toast.error(t(outcome.message ?? "Couldn't send a test notification"));
    else if (!outcome.sent) toast.error(t("No device got it. Turn notifications off and on again."));
    else toast.success(t("Test sent. It should arrive in a few seconds."));
  }

  let control: React.ReactNode = null;
  if (status === "loading") control = <Loader size={18} />;
  if (status === "off")
    control = (
      <Button variant="primary" size="sm" onClick={() => void turnOn()} disabled={busy || readOnly} className="pointer-coarse:h-11">
        {busy ? <Loader size={14} onDark /> : <BellRing aria-hidden="true" />}
        {t("Turn on")}
      </Button>
    );
  if (status === "blocked")
    control = (
      <Button variant="secondary" size="sm" onClick={() => void push.refresh()} className="pointer-coarse:h-11">
        <RotateCw aria-hidden="true" />
        {t("Check again")}
      </Button>
    );
  if (status === "on")
    control = (
      <span className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => void sendTest()} disabled={busy || readOnly} className="pointer-coarse:h-11">
          {t("Send a test")}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void turnOff()} disabled={busy || readOnly} className="pointer-coarse:h-11">
          {t("Turn off")}
        </Button>
      </span>
    );

  return (
    <div className="flex flex-col gap-3 border-t border-divider px-6 py-4 @xl:flex-row @xl:items-center @xl:gap-5" aria-busy={busy || status === "loading"}>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
          {t("Notifications on this device")}
          {status === "on" && (
            <Chip tone="mint" size="sm">
              {t("On@@status")}
            </Chip>
          )}
          {status === "blocked" && (
            <Chip tone="warning" size="sm">
              {t("Blocked@@status")}
            </Chip>
          )}
        </span>
        <span className="text-small leading-normal text-ink-muted">{t(BODY[status])}</span>
      </span>
      {control && <span className="shrink-0">{control}</span>}
    </div>
  );
}
