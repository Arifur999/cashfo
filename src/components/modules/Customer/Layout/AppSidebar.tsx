"use client";

import Link from "next/link";
import Logo from "@/components/smartly/Logo";
import { useScrollFades } from "@/hooks/useScrollFades";
import { BRAND_NAME } from "@/lib/brand";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { NIGHT_FOCUS, SidebarFoot, SidebarNav } from "./SidebarNav";

// The Night sidebar: 264px, the logo, the menu (fading at the edges when it
// scrolls) and the two foot links. Fixed on the left from `lg` up; below
// that NavDrawer opens the same menu from the top bar.
export function AppSidebar() {
  const { t } = useLocale();
  const { ref, style } = useScrollFades<HTMLElement>();

  return (
    <aside className="sticky top-0 hidden h-screen w-sidebar shrink-0 flex-col bg-night-panel px-3 pt-5 pb-4 text-white lg:flex print:hidden">
      <Link
        href={CUSTOMER_HOME_ROUTE}
        aria-label={t("{brand} home", { brand: BRAND_NAME })}
        className={cn("mb-4 flex h-11 shrink-0 items-center rounded-md px-2", NIGHT_FOCUS)}
      >
        <Logo onDark height={40} alt="" />
      </Link>
      <SidebarNav navRef={ref} style={style} />
      <div className="mt-2 border-t border-mint-200/12 pt-3">
        <SidebarFoot />
      </div>
    </aside>
  );
}
