"use client";

import { ChevronDown, CircleHelp, LayoutGrid, LogOut, Menu, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { useWorkspaceSwitch } from "@/components/modules/Customer/Workspace/useWorkspaceSwitch";
import { WorkspaceSwitcherList } from "@/components/modules/Customer/Workspace/WorkspaceSwitcherList";
import Avatar from "@/components/smartly/Avatar";
import Logo from "@/components/smartly/Logo";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useScrollFades } from "@/hooks/useScrollFades";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { CHOOSE_WORKSPACE_ROUTE, workspaceName } from "@/lib/customer/workspaceSwitch";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { LanguageSwitch } from "./LanguageSwitch";
import { NIGHT_FOCUS, SidebarFoot, SidebarNav } from "./SidebarNav";
import { ThemeToggle } from "./ThemeToggle";
import { workspaceKind } from "./workspaceKind";

// The foot rows, drawn like SidebarFoot's own (its mint focus ring too:
// the site's green one is lost on the Night panel).
const FOOT_ROW = cn("relative flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-body font-medium text-white/88 transition-colors hover:bg-black/12 hover:text-white [&_svg]:size-4.75 [&_svg]:shrink-0", NIGHT_FOCUS);
// The links under the workspace list.
const CARD_LINK = cn("flex h-10 items-center gap-3 rounded-md px-2.5 text-small font-semibold text-mint-200 hover:bg-white/6 hover:text-white [&_svg]:size-4 [&_svg]:shrink-0", NIGHT_FOCUS);

// Below `lg` the Night sidebar slides in from the left: the workspace at
// the top (it opens into every workspace there is to switch to), the menu,
// then help, sign out, language and theme at the bottom.
export function NavDrawer() {
  const { t } = useLocale();
  const { user, activeBusiness, logout } = useAuth();
  const darkModeOn = useFeature("dark_mode");
  const [open, setOpen] = useState(false);
  const [workspacesOpen, setWorkspacesOpen] = useState(false);
  const listId = useId();
  const { ref, style } = useScrollFades<HTMLElement>();
  const switcher = useWorkspaceSwitch({ onSwitched: () => changeOpen(false) });
  const name = activeBusiness ? workspaceName(activeBusiness, user.name) : user.name;

  // The workspace list starts folded each time the drawer opens.
  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) setWorkspacesOpen(false);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={changeOpen}>
        <SheetTrigger asChild>
          <button type="button" aria-label={t("Open menu")} className="flex size-11 shrink-0 items-center justify-center rounded-md text-ink lg:hidden">
            <Menu className="size-5.5" aria-hidden="true" />
          </button>
        </SheetTrigger>
        {/* 316px, as the board draws it; the side variant outranks the sheet's own w-3/4. */}
        <SheetContent
          side="left"
          showCloseButton={false}
          className="max-w-[85vw] gap-0 border-none bg-aurora-panel p-0 text-white shadow-[28px_0_60px_-16px_rgba(0,0,0,0.4)] data-[side=left]:w-79 data-[side=left]:sm:max-w-79"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{t("Main")}</SheetTitle>
          </SheetHeader>
          {/* Following a link closes the drawer. */}
          <div
            className="flex h-full flex-col px-3 pt-4 pb-4"
            onClickCapture={(event) => {
              if ((event.target as HTMLElement).closest("a")) changeOpen(false);
            }}
          >
            <div className="flex items-center justify-between px-1 pb-3">
              <Link href={CUSTOMER_HOME_ROUTE} aria-label={`${t("Home")}`} className={cn("rounded-md", NIGHT_FOCUS)}>
                <Logo onDark height={36} alt="" />
              </Link>
              <button type="button" onClick={() => changeOpen(false)} aria-label={t("Close menu")} className={cn("flex size-11 items-center justify-center rounded-md bg-white/8 text-white", NIGHT_FOCUS)}>
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mb-1 shrink-0 rounded-md bg-white/8">
              <button
                type="button"
                aria-expanded={workspacesOpen}
                aria-controls={listId}
                onClick={() => setWorkspacesOpen((value) => !value)}
                className={cn("flex w-full items-center gap-3 rounded-md p-3 text-left text-white", NIGHT_FOCUS)}
              >
                <Avatar name={user.name} src={user.avatarUrl} size={32} tone="mint" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-bold">{name}</span>
                  <span className="text-caption font-normal text-mint-200/80">
                    {t(workspaceKind(activeBusiness))} · {t("switch")}
                  </span>
                </span>
                <ChevronDown className={cn("size-4 text-white/70 transition-transform", workspacesOpen && "rotate-180")} aria-hidden="true" />
              </button>
              {workspacesOpen && (
                <div id={listId} className="flex max-h-[40vh] flex-col gap-0.5 overflow-y-auto border-t border-mint-200/12 px-1.5 pt-1.5 pb-2">
                  <WorkspaceSwitcherList switcher={switcher} variant="drawer" />
                  {/* The chooser has nothing to offer a single workspace. */}
                  {switcher.workspaces.length > 1 && (
                    <Link href={CHOOSE_WORKSPACE_ROUTE} className={cn(CARD_LINK, "mt-1")}>
                      <LayoutGrid aria-hidden="true" />
                      {t("See all workspaces")}
                    </Link>
                  )}
                  <Link href="/settings/workspaces" className={cn(CARD_LINK, switcher.workspaces.length <= 1 && "mt-1")}>
                    <SlidersHorizontal aria-hidden="true" />
                    {t("Manage workspaces")}
                  </Link>
                </div>
              )}
            </div>

            <SidebarNav compact={false} navRef={ref} style={style} />

            <div className="flex flex-col gap-0.5 border-t border-mint-200/12 pt-2">
              <SidebarFoot compact={false} />
              <Link href="/settings/help" className={FOOT_ROW}>
                <CircleHelp strokeWidth={1.9} aria-hidden="true" />
                {t("Help & support")}
              </Link>
              <button type="button" onClick={logout} className={FOOT_ROW}>
                <LogOut strokeWidth={1.9} aria-hidden="true" />
                {t("Sign out")}
              </button>
              <div className="flex items-center gap-2 px-1 pt-2">
                <LanguageSwitch onDark />
                {darkModeOn && <ThemeToggle onDark />}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      {switcher.pinPrompt}
    </>
  );
}
