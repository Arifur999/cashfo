"use client";

import { ChevronRight, Construction, Gift, Lock, MessageSquareText } from "lucide-react";
import Link from "next/link";
import T from "@/components/shared/T";
import Chip from "@/components/smartly/Chip";
import type { IPlatformSettings } from "@/types/settings.types";
import ReferralRulesCard from "./ReferralRulesCard";
import SettingsSideCard, { SIDE_CARD_LINK } from "./SettingsSideCard";

interface SettingsSideCardsProps {
  canManage: boolean;
  // undefined until the settings load, or when they couldn't be.
  settings: IPlatformSettings | undefined;
  loadFailed: boolean;
}

// The column beside General: referral rules, maintenance (switched from
// System) and where message wording lives, then who may change what. A
// setting that isn't loaded says so: maintenance never reads as Off on a
// guess.
const SettingsSideCards = ({ canManage, settings, loadFailed }: SettingsSideCardsProps) => {
  const on = settings?.maintenanceMode === true;

  return (
    <aside className="flex flex-col gap-4">
      {settings ? (
        <ReferralRulesCard amount={settings.referralRewardAmount} canManage={canManage} />
      ) : (
        <SettingsSideCard icon={Gift} tone="mint" title="Referral rules">
          <T>{loadFailed ? "Couldn't load" : "Loading..."}</T>
        </SettingsSideCard>
      )}
      <SettingsSideCard
        icon={Construction}
        tone="warning"
        title="Maintenance mode"
        action={
          // System is for super admins only, like changing settings.
          canManage && (
            <Link href="/admin/system" className={SIDE_CARD_LINK}>
              <T>Change in System</T> <ChevronRight aria-hidden="true" className="size-3.5" strokeWidth={2.25} />
            </Link>
          )
        }
      >
        {settings ? (
          <>
            <Chip tone={on ? "warning" : "neutral"} size="sm" className="mr-1">
              <T>{on ? "On" : "Off"}</T>
            </Chip>
            <T>{on ? "Customers see the maintenance message and can't use the app." : "The app works as normal."}</T>
          </>
        ) : (
          <T>{loadFailed ? "Couldn't check" : "Checking..."}</T>
        )}
      </SettingsSideCard>
      <SettingsSideCard
        icon={MessageSquareText}
        tone="info"
        title="Messages to users"
        action={
          <Link href="/admin/notifications" className={SIDE_CARD_LINK}>
            <T>Open message templates</T> <ChevronRight aria-hidden="true" className="size-3.5" strokeWidth={2.25} />
          </Link>
        }
      >
        <T>Email, SMS and in-app message wording lives in templates, in English and Bangla.</T>
      </SettingsSideCard>
      <p role="note" className="flex gap-3 rounded-md border border-line bg-strip px-4 py-3 text-small leading-normal text-ink-2">
        <Lock className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <span>
          <T>Support, Finance and Content admins see this page with the fields locked.</T>
        </span>
      </p>
    </aside>
  );
};

export default SettingsSideCards;
