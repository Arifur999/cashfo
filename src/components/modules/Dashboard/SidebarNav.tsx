"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createElement } from "react";
import { getIconComponent } from "@/lib/iconMapper";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { findAdminNavLocation, isNavItemViewOnly, menuPathFor, navItemHref, type NavSection } from "@/lib/navItem";
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

// The admin menu on the deep-teal panel, as the AdminSidebar board draws it:
// groups 14px apart under small uppercase names, 38px rows, the open page on
// mint with forest text, a lock on pages this role can only read and a count
// where work is waiting. A page's own tabs (Subscriptions: Plans, Coupons)
// live under its header, not here; any of them lights its item. A user's
// page opened from Owners or Workspaces keeps that item lit (its ?from=).
const SidebarNav = ({ sections, role, onNavigate, className }: SidebarNavProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { translate } = useLocale();
  const location = findAdminNavLocation(menuPathFor(pathname, searchParams.get("from")), sections);

  return (
    <nav aria-label={translate("Admin")} className={cn("flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden", className)}>
      {sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-px">
          <span className="px-3 pb-1.25 text-[11px] leading-[normal] font-semibold tracking-[0.08em] text-mint-200/75 uppercase">{translate(section.title)}</span>
          {section.items.map((item) => {
            const on = location?.item === item;
            const viewOnly = isNavItemViewOnly(item, role);
            return (
              <Link
                key={item.href}
                href={navItemHref(item)}
                onClick={onNavigate}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative flex h-9.5 shrink-0 items-center gap-2.5 rounded-md pr-2 pl-2.5 text-body whitespace-nowrap transition-colors",
                  on ? "bg-mint-200 font-semibold text-forest" : "font-medium text-white/82 hover:bg-white/8 hover:text-white",
                )}
              >
                {createElement(getIconComponent(item.icon), { className: cn("size-4.25 shrink-0", on ? "text-forest" : "text-mint-200/75"), strokeWidth: 2, "aria-hidden": true })}
                <span className="min-w-0 flex-1 truncate">{translate(item.title)}</span>
                {viewOnly && (
                  <span title={translate("View only for your role")} className={cn("flex", on ? "text-forest/70" : "text-mint-200/75")}>
                    <Lock className="size-3.25" strokeWidth={2.25} aria-hidden="true" />
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
