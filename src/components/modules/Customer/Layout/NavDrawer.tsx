"use client";

import { ChevronDown, LayoutGrid, Menu, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { useWorkspaceSwitch } from "@/components/modules/Customer/Workspace/useWorkspaceSwitch";
import { WorkspaceSwitcherList } from "@/components/modules/Customer/Workspace/WorkspaceSwitcherList";
import Avatar from "@/components/smartly/Avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { navAppFor } from "@/lib/customer/nav";
import { CHOOSE_WORKSPACE_ROUTE, workspaceName } from "@/lib/customer/workspaceSwitch";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BrandBlock, SidebarPanel } from "./AppSidebar";
import { ThemeToggle } from "./ThemeToggle";
import { workspaceKind } from "./workspaceKind";

// The links under the workspace list.
const CARD_LINK = "flex h-10 items-center gap-3 rounded-md px-2.5 text-small font-semibold text-brand-ink hover:bg-surface [&_svg]:size-4 [&_svg]:shrink-0";

// Below `lg` the sidebar of the page's app slides in from the left (the
// boards: "below 1024px the sidebar becomes a drawer behind the menu
// button"): the brand block with the close button, the open workspace
// (it opens into every workspace there is to switch to), the menu and the
// foot, with the theme button beside the language switch.
export function NavDrawer({ className }: { className?: string }) {
  const { t } = useLocale();
  const { user, activeBusiness } = useAuth();
  const app = navAppFor(usePathname());
  const darkModeOn = useFeature("dark_mode");
  const [open, setOpen] = useState(false);
  const [workspacesOpen, setWorkspacesOpen] = useState(false);
  const listId = useId();
  const switcher = useWorkspaceSwitch({ onSwitched: () => changeOpen(false) });
  const name = activeBusiness ? workspaceName(activeBusiness, user.name) : user.name;

  // The workspace list starts folded each time the drawer opens.
  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) setWorkspacesOpen(false);
  }

  const header = (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <BrandBlock app={app} as="static" />
        </div>
        <button type="button" onClick={() => changeOpen(false)} aria-label={t("Close menu")} className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface-sunken">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="rounded-md bg-surface-sunken">
        <button type="button" aria-expanded={workspacesOpen} aria-controls={listId} onClick={() => setWorkspacesOpen((value) => !value)} className="flex w-full items-center gap-3 rounded-md p-2.5 text-left text-ink">
          <Avatar name={user.name} src={user.avatarUrl} size={32} tone="soft" alt="" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-body font-semibold">{name}</span>
            <span className="text-caption font-normal text-ink-muted">
              {t(workspaceKind(activeBusiness))} · {t("switch")}
            </span>
          </span>
          <ChevronDown className={cn("size-4 text-ink-muted transition-transform", workspacesOpen && "rotate-180")} aria-hidden="true" />
        </button>
        {workspacesOpen && (
          <div id={listId} className="flex max-h-[40vh] flex-col gap-0.5 overflow-y-auto border-t border-line px-1.5 pt-1.5 pb-2">
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
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={changeOpen}>
        <SheetTrigger asChild>
          <button type="button" aria-label={t("Open menu")} className={cn("flex h-11 w-10 shrink-0 items-center justify-center rounded-full text-ink lg:hidden", className)}>
            <Menu className="size-5.5" strokeWidth={2} aria-hidden="true" />
          </button>
        </SheetTrigger>
        {/* 316px; the side variant outranks the sheet's own w-3/4. */}
        <SheetContent side="left" showCloseButton={false} className="max-w-[85vw] gap-0 border-r border-line bg-surface p-0 text-ink shadow-overlay data-[side=left]:w-79 data-[side=left]:sm:max-w-79">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("Main")}</SheetTitle>
          </SheetHeader>
          {/* Following a link closes the drawer. */}
          <div
            className="flex h-full flex-col px-3 pt-3 pb-4"
            onClickCapture={(event) => {
              if ((event.target as HTMLElement).closest("a")) changeOpen(false);
            }}
          >
            <SidebarPanel app={app} touch header={header} footExtra={darkModeOn ? <ThemeToggle className="size-9 rounded-full border border-line bg-surface" /> : undefined} />
          </div>
        </SheetContent>
      </Sheet>
      {switcher.pinPrompt}
    </>
  );
}
