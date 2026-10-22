"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Logo from "@/components/smartly/Logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useScrollFades } from "@/hooks/useScrollFades";
import { BRAND_NAME } from "@/lib/brand";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { sidebarCookie } from "@/lib/customer/sidebarState";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { NIGHT_FOCUS, SidebarFoot, SidebarNav } from "./SidebarNav";

// The Night sidebar: 264px, the logo, the menu (fading at the edges when it
// scrolls) and the two foot links. Fixed on the left from `lg` up; below
// that NavDrawer opens the same menu from the top bar. It folds to a 72px
// rail of icons -- the mark in place of the logo, each name in a tooltip --
// and remembers that in a cookie, so the server draws it folded too.
export function AppSidebar({ initialCollapsed = false }: { initialCollapsed?: boolean }) {
  const { t } = useLocale();
  const { ref, style } = useScrollFades<HTMLElement>();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = sidebarCookie(next);
  };
  const toggleLabel = t(collapsed ? "Expand sidebar" : "Collapse sidebar");
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  const toggleButton = (
    <button
      type="button"
      onClick={toggle}
      aria-label={toggleLabel}
      aria-expanded={!collapsed}
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white", NIGHT_FOCUS)}
    >
      <ToggleIcon className="size-4.5" strokeWidth={1.9} aria-hidden="true" />
    </button>
  );

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden bg-aurora-panel pt-5 pb-4 text-white transition-[width] duration-200 ease-out motion-reduce:transition-none lg:flex print:hidden",
        collapsed ? "w-18 px-3" : "w-sidebar px-3",
      )}
    >
      <div className={cn("mb-4 flex shrink-0 items-center", collapsed ? "flex-col gap-2" : "justify-between gap-2")}>
        <Link
          href={CUSTOMER_HOME_ROUTE}
          aria-label={t("{brand} home", { brand: BRAND_NAME })}
          className={cn("flex h-11 shrink-0 items-center rounded-md", collapsed ? "justify-center px-1" : "px-2", NIGHT_FOCUS)}
        >
          {collapsed ? <Logo variant="mark" height={34} alt="" /> : <Logo onDark height={40} alt="" />}
        </Link>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{toggleButton}</TooltipTrigger>
            <TooltipContent side="right">{toggleLabel}</TooltipContent>
          </Tooltip>
        ) : (
          toggleButton
        )}
      </div>
      <SidebarNav navRef={ref} style={style} collapsed={collapsed} />
      <div className="mt-2 border-t border-mint-200/12 pt-3">
        <SidebarFoot collapsed={collapsed} />
      </div>
    </aside>
  );
}
