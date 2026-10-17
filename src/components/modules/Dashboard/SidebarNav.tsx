"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createElement } from "react";
import { getIconComponent } from "@/lib/iconMapper";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { isNavItemActive, isNavItemViewOnly, type NavSection } from "@/lib/navItem";
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
// count where work is waiting.
const SidebarNav = ({ sections, role, onNavigate, className }: SidebarNavProps) => {
  const pathname = usePathname();
  const { translate } = useLocale();

  return (
    <nav aria-label={translate("Admin")} className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      {sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-0.5">
          <span className="flex h-8 items-center px-3 pt-3 pb-2 text-caption font-bold tracking-[0.1em] text-mint-200/62 uppercase">{translate(section.title)}</span>
          {section.items.map((item) => {
            const on = isNavItemActive(item, pathname);
            const viewOnly = isNavItemViewOnly(item, role);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative flex h-9.5 items-center gap-3 rounded-md px-3 text-body transition-colors",
                  on ? "bg-mint-200/14 font-semibold text-white" : "font-medium text-white/74 hover:bg-white/6 hover:text-white",
                )}
              >
                {on && <span aria-hidden="true" className="absolute top-[9px] -left-3 h-5 w-0.75 rounded-r-[3px] bg-[#14B57A]" />}
                {createElement(getIconComponent(item.icon), { className: cn("size-4.5 shrink-0", on ? "opacity-100" : "opacity-85"), strokeWidth: 1.9, "aria-hidden": true })}
                <span className="min-w-0 flex-1 truncate">{translate(item.title)}</span>
                {viewOnly && (
                  <span title={translate("View only for your role")} className="flex opacity-55">
                    <Lock className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
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
