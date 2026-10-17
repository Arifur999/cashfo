"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Construction, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { platformSettingsQuery } from "@/queries/settings.queries";
import ReferralRulesCard from "./ReferralRulesCard";
import SettingsSideCard, { SIDE_CARD_LINK } from "./SettingsSideCard";

// The column beside General: referral rules, maintenance (switched from
// System) and where message wording lives, then who may change what.
const SettingsSideCards = ({ canManage }: { canManage: boolean }) => {
  const settings = useQuery(platformSettingsQuery()).data?.data;
  const on = settings?.maintenanceMode ?? false;

  return (
    <aside className="flex flex-col gap-4">
      {settings && <ReferralRulesCard amount={settings.referralRewardAmount} canManage={canManage} />}
      <SettingsSideCard
        icon={Construction}
        tone="warning"
        title="Maintenance mode"
        action={
          // System is for super admins only, like changing settings.
          canManage && (
            <Link href="/admin/system" className={SIDE_CARD_LINK}>
              Change in System <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          )
        }
      >
        <span className={cn("mr-1 rounded-full px-2 py-0.5 text-caption font-semibold", on ? "bg-warning-soft text-warning" : "bg-surface-sunken text-ink-2")}>{on ? "On" : "Off"}</span>
        {on ? "Customers see the maintenance message and can't use the app." : "The app works as normal."}
      </SettingsSideCard>
      <SettingsSideCard
        icon={MessageSquareText}
        tone="info"
        title="Messages to users"
        action={
          <Link href="/admin/notifications" className={SIDE_CARD_LINK}>
            Open message templates <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        }
      >
        Email, SMS and in-app message wording lives in templates, in English and Bangla.
      </SettingsSideCard>
      <p role="note" className="rounded-md border border-line bg-cream px-4 py-3 text-small leading-normal text-ink-2">
        Support, Finance and Content admins see this page with the fields locked.
      </p>
    </aside>
  );
};

export default SettingsSideCards;
