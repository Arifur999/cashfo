"use client";

import { Check, ChevronDown, ChevronLeft, Lock, LogOut, Pause, ShieldCheck, Users } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { useEffect, useState } from "react";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Chip, { type ChipTone } from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useScrollFades } from "@/hooks/useScrollFades";
import type { GroupSettings, MemberRole } from "@/lib/customer/api";
import { ACCESS_HINTS, ACCESS_LABELS, accessLevelOf, type GroupAccess, type GroupAccessLevel } from "@/lib/customer/groupAccess";
import { GROUP_TAB_LABELS, groupTabHref, groupTabsFor, type GroupTab } from "@/lib/customer/groupDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GROUP_KIND } from "./GroupBits";
import { MemberPasswordDialog } from "./MemberPasswordDialog";

interface GroupHeaderProps {
  businessId: string;
  name: string;
  settings: GroupSettings;
  tab: GroupTab;
  // Active members; who is looking (Admin, Editor or Viewer); the
  // customer's groups and their role in each (Switch group).
  memberCount: number;
  access: GroupAccess;
  groups: { id: string; name: string; role: MemberRole }[];
  // The month pill on the right, on the pages that show one month.
  period?: React.ReactNode;
}

const MENU_ITEM = "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-1.5 text-[13.5px] font-semibold text-ink focus:bg-strip";
const ROLE_TONES: Record<GroupAccessLevel, ChipTone> = { ADMIN: "mint", EDITOR: "warning", VIEWER: "info" };
const PILL = "flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 text-[13px] font-semibold whitespace-nowrap text-ink hover:border-mint-200 hover:bg-strip [&_svg]:size-3.5 [&_svg]:text-ink-soft";

// The line under a phone tab: solid on the one on show, pulsing on the one
// just pressed while its page loads.
function TabLine({ on }: { on: boolean }) {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" className={cn("absolute right-2 -bottom-px left-2 h-0.5 rounded-sm transition-opacity", on ? "bg-emerald" : pending ? "animate-pulse bg-emerald/50 motion-reduce:animate-none" : "opacity-0")} />;
}

// Every page inside a group starts with the group's name and kind (the v7
// GroupHeader board). Its pages are the sidebar's; a phone, which has no
// sidebar on screen, keeps them in a strip under the name.
export function GroupHeader({ businessId, name, settings, tab, memberCount, access, groups, period }: GroupHeaderProps) {
  const { t, fmt } = useLocale();
  const { user, askSignOut } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const kind = GROUP_KIND[settings.kind];
  const { ref: tabsRef, style: tabsStyle } = useScrollFades<HTMLElement>({ axis: "x", fade: 32 });
  // The page on show is brought to the middle of the strip.
  useEffect(() => {
    const bar = tabsRef.current;
    const link = bar?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!bar || !link || bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollLeft = link.offsetLeft - (bar.clientWidth - link.offsetWidth) / 2;
  }, [tabsRef, tab]);

  const roleHintId = `group-role-hint-${businessId}`;
  // Settings are the Admin's: nobody else gets the tab.
  const tabs = groupTabsFor(settings.mealsOn).filter((value) => value !== "settings" || access.level === "ADMIN");
  const signedInAs = user.username ? `${user.name} (${user.username})` : user.name;

  return (
    <div className="flex flex-col gap-3">
      <TopbarExtras record={name} />
      <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-3 md:min-h-15 md:flex-nowrap md:gap-3.5">
        <Link href="/group-expenses" aria-label={t("Back to Group Expense")} className="-ml-2.5 flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-sunken md:hidden">
          <ChevronLeft className="size-5.5" aria-hidden="true" />
        </Link>
        <IconTile tone="neutral" size={48} className={cn(kind.cls, "size-12 rounded-[14px] max-md:hidden [&_svg]:size-6")}>
          <kind.icon strokeWidth={1.75} />
        </IconTile>
        <span className="flex min-w-0 flex-1 flex-col gap-1.25">
          <span className="flex min-w-0 items-center gap-1.5 md:gap-2.5">
            {/* Normal line height: a tight one clips Bangla vowel signs under the truncation. */}
            <h1 className="truncate text-title text-ink md:text-[22px] md:leading-[1.2] md:font-semibold md:tracking-[-0.02em]">{name}</h1>
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
                  {groups.map((group) => {
                    const here = group.id === businessId;
                    return (
                      <DropdownMenuItem key={group.id} asChild className={cn(MENU_ITEM, here && "bg-mint-50/60")}>
                        <Link href={`/group-expenses/${group.id}`} aria-current={here ? "page" : undefined}>
                          <IconTile tone="neutral" size={32} className={cn("size-7.5 rounded-[9px]", here && kind.cls)}>
                            {here ? <kind.icon strokeWidth={1.9} /> : <Users strokeWidth={1.9} />}
                          </IconTile>
                          <span className="flex min-w-0 flex-1 flex-col gap-px">
                            <span className="truncate">{group.name}</span>
                            <span className="text-[12px] font-normal text-ink-muted">{t(ACCESS_LABELS[accessLevelOf(group.role)])}</span>
                          </span>
                          {here && <Check className="size-4 text-emerald" strokeWidth={2.5} aria-hidden="true" />}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator className="mx-1.5 my-1 bg-divider" />
                  <DropdownMenuItem asChild className={cn(MENU_ITEM, "text-emerald")}>
                    <Link href="/group-expenses">{t(access.portal ? "All groups" : "All groups · New group")}</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </span>
          <span className="flex items-center gap-2 text-[13px] text-ink-muted max-md:hidden">
            {t(memberCount === 1 ? "{count} member" : "{count} members", { count: formatCount(memberCount, fmt) })}
            <span aria-hidden="true">·</span>
            {/* The role, and on hover or focus what it allows (the board's tooltip). */}
            <span tabIndex={0} aria-describedby={roleHintId} className="group/role relative cursor-help rounded-full outline-none focus-visible:focus-halo">
              <Chip tone={ROLE_TONES[access.level]} size="sm" className="gap-1 px-2 text-[12px]">
                <ShieldCheck className="size-3" strokeWidth={2.25} aria-hidden="true" />
                {t("You: {role}", { role: t(ACCESS_LABELS[access.level]) })}
              </Chip>
              <span
                role="tooltip"
                id={roleHintId}
                className="pointer-events-none invisible absolute top-[calc(100%+8px)] left-0 z-45 w-max max-w-70 rounded-[10px] bg-ink px-2.75 py-2 text-[12px] leading-[1.45] font-medium whitespace-normal text-surface opacity-0 shadow-overlay transition-opacity group-hover/role:visible group-hover/role:opacity-100 group-focus/role:visible group-focus/role:opacity-100"
              >
                {t(ACCESS_HINTS[access.level])}
              </span>
            </span>
          </span>
        </span>

        {/* A member's portal login: who is signed in, their password and Sign out. */}
        {access.portal && (
          <div className="flex shrink-0 items-center gap-2.5 max-md:order-last max-md:w-full">
            <span className="flex max-w-50 min-w-0 flex-col items-end gap-px max-md:mr-auto max-md:items-start">
              <span className="text-[11.5px] text-ink-muted">{t("Signed in as")}</span>
              <span className="max-w-50 truncate text-[13.5px] font-semibold text-ink">{user.name}</span>
            </span>
            <button type="button" aria-haspopup="dialog" onClick={() => setPasswordOpen(true)} className={PILL}>
              <Lock strokeWidth={2} aria-hidden="true" />
              {t("Change password")}
            </button>
            <button type="button" onClick={askSignOut} className={PILL}>
              <LogOut strokeWidth={2} aria-hidden="true" />
              {t("Sign out")}
            </button>
          </div>
        )}
        {period && <span className="shrink-0 max-md:hidden">{period}</span>}
      </div>
      {period && <div className="md:hidden">{period}</div>}
      <nav ref={tabsRef} style={tabsStyle} aria-label={t("Group pages")} className="-mx-4 flex overflow-x-auto border-b border-line px-2 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
        {tabs.map((value) => (
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
      {access.portal && <MemberPasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} who={signedInAs} />}
    </div>
  );
}
