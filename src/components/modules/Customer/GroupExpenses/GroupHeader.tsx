"use client";

import { Check, ChevronDown, ChevronLeft, Pause, ShieldCheck, Users } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { useEffect } from "react";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useScrollFades } from "@/hooks/useScrollFades";
import type { GroupSettings, MemberRole } from "@/lib/customer/api";
import { GROUP_TAB_LABELS, groupTabHref, groupTabsFor, type GroupTab } from "@/lib/customer/groupDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GROUP_KIND } from "./GroupBits";

interface GroupHeaderProps {
  businessId: string;
  name: string;
  settings: GroupSettings;
  tab: GroupTab;
  // Active members, the customer's role here, and their groups (Switch group).
  memberCount: number;
  role: MemberRole;
  groups: { id: string; name: string }[];
}

const MENU_ITEM = "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-1.5 text-[13.5px] font-semibold text-ink focus:bg-strip";

// The line under a phone tab: solid on the one on show, pulsing on the one
// just pressed while its page loads.
function TabLine({ on }: { on: boolean }) {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" className={cn("absolute right-2 -bottom-px left-2 h-0.5 rounded-sm transition-opacity", on ? "bg-emerald" : pending ? "animate-pulse bg-emerald/50 motion-reduce:animate-none" : "opacity-0")} />;
}

// Every page inside a group starts with the group's name and kind (the v7
// GroupHeader board). Its pages are the sidebar's; a phone, which has no
// sidebar on screen, keeps them in a strip under the name.
export function GroupHeader({ businessId, name, settings, tab, memberCount, role, groups }: GroupHeaderProps) {
  const { t, fmt } = useLocale();
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
        <IconTile tone="neutral" size={48} className={cn(kind.cls, "size-control-lg rounded-[14px] max-md:hidden [&_svg]:size-6.5")}>
          <kind.icon strokeWidth={1.75} />
        </IconTile>
        <span className="flex min-w-0 flex-1 flex-col gap-1.25">
          <span className="flex min-w-0 items-center gap-1.5 md:gap-2.5">
            {/* Normal line height: a tight one clips Bangla vowel signs under the truncation. */}
            <h1 className="truncate text-title text-ink md:text-page-title md:leading-normal">{name}</h1>
            <Chip tone="neutral" className={cn(kind.cls, "px-2.25 max-md:h-4.5 max-md:px-1.75 max-md:text-[11px]")}>
              {t(kind.label)}
            </Chip>
            {settings.pausedAt && (
              <Chip tone="neutral" className="gap-1 px-2.25 max-md:h-4.5 max-md:px-1.75 max-md:text-[11px]">
                <Pause className="size-3" aria-hidden="true" />
                {t("Paused")}
              </Chip>
            )}
            {groups.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-7 shrink-0 items-center gap-1.25 rounded-full border border-line bg-surface pr-2 pl-2.5 text-[12.5px] font-semibold whitespace-nowrap text-ink-2 hover:border-mint-200 data-open:border-mint-200 max-md:hidden">
                  {t("Switch group")}
                  <ChevronDown className="size-3.5 text-ink-muted" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={8} className="w-75 rounded-[14px] border border-line bg-surface p-1.5 shadow-overlay ring-0">
                  <DropdownMenuLabel className="px-2.5 pt-1.5 pb-1 text-[11.5px] font-semibold tracking-[0.03em] text-ink-muted">{t("YOUR GROUPS")}</DropdownMenuLabel>
                  {groups.map((group) => (
                    <DropdownMenuItem key={group.id} asChild className={MENU_ITEM}>
                      <Link href={`/group-expenses/${group.id}`} aria-current={group.id === businessId ? "page" : undefined}>
                        <IconTile tone="neutral" size={32} className={cn("size-7.5 rounded-[9px]", group.id === businessId && kind.cls)}>
                          {group.id === businessId ? <kind.icon strokeWidth={1.75} /> : <Users strokeWidth={1.75} />}
                        </IconTile>
                        <span className="min-w-0 flex-1 truncate">{group.name}</span>
                        {group.id === businessId && <Check className="size-4 text-emerald" aria-hidden="true" />}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator className="mx-1.5 my-1 bg-divider" />
                  <DropdownMenuItem asChild className={MENU_ITEM}>
                    <Link href="/group-expenses">{t("All groups · New group")}</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </span>
          <span className="flex items-center gap-2 text-[13px] text-ink-muted max-md:hidden">
            {t(memberCount === 1 ? "{count} member" : "{count} members", { count: formatCount(memberCount, fmt) })}
            <span aria-hidden="true">·</span>
            <Chip tone="mint" size="sm" className="gap-1 px-2 text-[12px]">
              <ShieldCheck className="size-3" aria-hidden="true" />
              {t(role === "OWNER" ? "You: Admin" : "You: Member")}
            </Chip>
          </span>
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
