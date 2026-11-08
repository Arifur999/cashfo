"use client";

import { BellOff } from "lucide-react";
import Link from "next/link";
import Banner from "@/components/smartly/Banner";
import { usePushStatus } from "@/hooks/usePushSubscription";
import { REMINDERS_ANCHOR } from "@/lib/customer/settingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Where notifications are turned on: Settings › App › Reminders.
export const PUSH_SETTINGS_HREF = `/settings/notifications#${REMINDERS_ANCHOR}`;

const NOTE = {
  off: "Notifications are off on this device, so this reminder only shows in the bell.",
  blocked: "Notifications are blocked for this site, so this reminder only shows in the bell.",
  "ios-install": "On iPhone, add Smartly to your Home Screen to get reminders as notifications.",
  unsupported: "This browser can't show notifications, so this reminder only shows in the bell.",
} as const;

// A small note under a reminder that's on, when this device won't be told:
// notifications off, blocked, or an iPhone that hasn't added the app to its
// Home Screen. Nothing while it is being worked out, or once it is on.
export function ReminderPushHint({ className }: { className?: string }) {
  const { t } = useLocale();
  const { status } = usePushStatus();
  if (!(status in NOTE)) return null;
  return (
    <Banner tone="neutral" inline icon={<BellOff />} role="note" className={className}>
      {t(NOTE[status as keyof typeof NOTE])}{" "}
      {status !== "unsupported" && (
        <Link href={PUSH_SETTINGS_HREF} className="font-semibold text-emerald underline-offset-4 hover:underline">
          {status === "off" ? t("Turn on notifications") : t("See how")}
        </Link>
      )}
    </Banner>
  );
}
