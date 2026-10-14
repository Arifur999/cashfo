"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import Avatar from "@/components/smartly/Avatar";
import Logo from "@/components/smartly/Logo";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useScrollFades } from "@/hooks/useScrollFades";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LanguageSwitch } from "./LanguageSwitch";
import { SidebarFoot, SidebarNav } from "./SidebarNav";
import { ThemeToggle } from "./ThemeToggle";
import { workspaceKind } from "./workspaceKind";

// Below `lg` the Night sidebar slides in from the left: the workspace at
// the top, the menu, then language and theme at the bottom.
export function NavDrawer() {
  const { t } = useLocale();
  const { user, activeBusiness } = useAuth();
  const darkModeOn = useFeature("dark_mode");
  const [open, setOpen] = useState(false);
  const { ref, style } = useScrollFades<HTMLElement>();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" aria-label={t("Open menu")} className="flex size-11 shrink-0 items-center justify-center rounded-md text-ink lg:hidden">
          <Menu className="size-5.5" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-79 max-w-[85vw] gap-0 border-none bg-night-panel p-0 text-white shadow-[28px_0_60px_-16px_rgba(0,0,0,0.4)] sm:max-w-79"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{t("Main")}</SheetTitle>
        </SheetHeader>
        {/* Following a link closes the drawer. */}
        <div
          className="flex h-full flex-col px-3 pt-4 pb-4"
          onClickCapture={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          <div className="flex items-center justify-between px-1 pb-3">
            <Link href={CUSTOMER_HOME_ROUTE} aria-label={`${t("Home")}`} className="rounded-md">
              <Logo onDark height={36} alt="" />
            </Link>
            <button type="button" onClick={() => setOpen(false)} aria-label={t("Close menu")} className="flex size-11 items-center justify-center rounded-md bg-white/8 text-white">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <Link href="/settings/workspaces" className="mb-1 flex items-center gap-3 rounded-md bg-white/8 p-3 text-white">
            <Avatar name={user.name} src={user.avatarUrl} size={32} tone="mint" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body font-bold">{user.name}</span>
              <span className="text-caption font-normal text-mint-200/80">
                {t(workspaceKind(activeBusiness))} · {t("switch")}
              </span>
            </span>
            <ChevronDown className="size-4 text-white/70" aria-hidden="true" />
          </Link>

          <SidebarNav compact={false} navRef={ref} style={style} />

          <div className="flex flex-col gap-0.5 border-t border-mint-200/12 pt-2">
            <SidebarFoot compact={false} />
            <div className="flex items-center gap-2 px-1 pt-2">
              <LanguageSwitch onDark />
              {darkModeOn && <ThemeToggle onDark />}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
