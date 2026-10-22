"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createElement } from "react";
import { getIconComponent } from "@/lib/iconMapper";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { isNavItemActive, isNavItemViewOnly, menuPathFor, navItemHref, type NavSection } from "@/lib/navItem";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/types/auth.types";
import NavBadge from "./NavBadge";

interface SidebarNavProps {
  sections: NavSection[];
  role: AdminRole;
  // Lets the mobile drawer close itself after a link is followed.
  onNavigate?: () => void;
  className?: string;
}

// The admin menu on the Night sidebar: five groups, 38px rows, the jade
// marker on the open page, a lock on pages this role can only read and a
// count where work is waiting. A user's page opened from Owners or
// Workspaces keeps that item lit (its ?from=).
const SidebarNav = ({ sections, role, onNavigate, className }: SidebarNavProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { translate } = useLocale();
  const menuPath = menuPathFor(pathname, searchParams.get("from"));

  return (
    <nav aria-label={translate("Admin")} className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden", className)}>
      {sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-0.5">
          <span className="flex h-8 items-center px-3 pt-3 pb-2 text-caption font-bold tracking-widest text-mint-200 uppercase">{translate(section.title)}</span>
          {section.items.map((item) => {
            const on = isNavItemActive(item, menuPath);
            const viewOnly = isNavItemViewOnly(item, role);
            return (
              <Link
                key={item.href}
                href={navItemHref(item)}
                onClick={onNavigate}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative flex h-9.5 items-center gap-3 rounded-md px-3 text-body transition-colors",
                  on ? "bg-black/22 font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]" : "font-medium text-white hover:bg-black/12 hover:text-white",
                )}
              >
                {on && <span aria-hidden="true" className="absolute top-2.25 -left-3 h-5 w-0.75 rounded-r-[3px] bg-night-marker" />}
                {createElement(getIconComponent(item.icon), { className: cn("size-4.5 shrink-0", on ? "opacity-100" : "opacity-85"), strokeWidth: 1.9, "aria-hidden": true })}
                <span className="min-w-0 flex-1 truncate">{translate(item.title)}</span>
                {viewOnly && (
                  <span title={translate("View only for your role")} className="flex opacity-55">
                    <Lock className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
                    {/* The tooltip only reaches a mouse; this reaches a screen reader. */}
                    <span className="sr-only">{translate("View only for your role")}</span>
                  </span>
                )}
                {!viewOnly && item.badge && <NavBadge kind={item.badge} />}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
};

export default SidebarNav;
