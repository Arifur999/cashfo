"use client";

import { ChevronLeft, Pause } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { useEffect } from "react";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import { useScrollFades } from "@/hooks/useScrollFades";
import type { GroupSettings } from "@/lib/customer/api";
import { GROUP_TAB_LABELS, groupTabHref, groupTabsFor, type GroupTab } from "@/lib/customer/groupDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GROUP_KIND } from "./GroupBits";

interface GroupHeaderProps {
  businessId: string;
  name: string;
  settings: GroupSettings;
  tab: GroupTab;
}

// The line under a phone tab: solid on the one on show, pulsing on the one
// just pressed while its page loads.
function TabLine({ on }: { on: boolean }) {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" className={cn("absolute right-2 -bottom-px left-2 h-0.5 rounded-sm transition-opacity", on ? "bg-emerald" : pending ? "animate-pulse bg-emerald/50 motion-reduce:animate-none" : "opacity-0")} />;
}

// Every page inside a group starts with the group's name and kind (the v7
// GroupHeader board). Its pages are the sidebar's; a phone, which has no
// sidebar on screen, keeps them in a strip under the name.
export function GroupHeader({ businessId, name, settings, tab }: GroupHeaderProps) {
  const { t } = useLocale();
  const kind = GROUP_KIND[settings.kind];
  const { ref: tabsRef, style: tabsStyle } = useScrollFades<HTMLElement>({ axis: "x", fade: 32 });
  // The page on show is brought to the middle of the strip.
  useEffect(() => {
    const bar = tabsRef.current;
    const link = bar?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!bar || !link || bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollLeft = link.offsetLeft - (bar.clientWidth - link.offsetWidth) / 2;
  }, [tabsRef, tab]);

  return (
    <div className="flex flex-col gap-3">
      <TopbarExtras record={name} />
      <div className="flex min-w-0 items-center gap-1 md:gap-4">
        <Link href="/group-expenses" aria-label={t("Back to Group Expense")} className="-ml-2.5 flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-sunken md:hidden">
          <ChevronLeft className="size-5.5" aria-hidden="true" />
        </Link>
        <IconTile tone={kind.tone} size={48} className="size-control-lg rounded-[14px] max-md:hidden [&_svg]:size-6.5">
          <kind.icon strokeWidth={1.75} />
        </IconTile>
        <span className="flex min-w-0 flex-1 items-center gap-1.5 md:gap-2.5">
          {/* Normal line height: a tight one clips Bangla vowel signs under the truncation. */}
          <h1 className="truncate text-title text-ink md:text-page-title md:leading-normal">{name}</h1>
          <Chip tone={kind.tone} className="px-2.25 max-md:h-4.5 max-md:px-1.75 max-md:text-[11px]">
            {t(kind.label)}
          </Chip>
          {settings.pausedAt && (
            <Chip tone="neutral" className="gap-1 px-2.25 max-md:h-4.5 max-md:px-1.75 max-md:text-[11px]">
              <Pause className="size-3" aria-hidden="true" />
              {t("Paused")}
            </Chip>
          )}
        </span>
      </div>
      <nav ref={tabsRef} style={tabsStyle} aria-label={t("Group pages")} className="-mx-4 flex overflow-x-auto border-b border-line px-2 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
        {groupTabsFor(settings.kind, settings.mealsOn).map((value) => (
          <Link
            key={value}
            href={groupTabHref(businessId, value)}
            aria-current={value === tab ? "page" : undefined}
            className={cn("relative flex h-11 shrink-0 items-center px-3 text-small whitespace-nowrap", value === tab ? "font-semibold text-emerald" : "font-medium text-ink-soft")}
          >
            {t(GROUP_TAB_LABELS[value])}
            <TabLine on={value === tab} />
          </Link>
        ))}
      </nav>
    </div>
  );
}
