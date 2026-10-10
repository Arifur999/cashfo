"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createElement } from "react";
import { getIconComponent } from "@/lib/iconMapper";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { isNavItemActive, type NavSection } from "@/lib/navItem";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  sections: NavSection[];
  // Lets the mobile drawer close itself after a link is followed.
  onNavigate?: () => void;
}

// Shared by the desktop sidebar and the mobile drawer.
const SidebarNav = ({ sections, onNavigate }: SidebarNavProps) => {
  const pathname = usePathname();
  const { translate } = useLocale();

  return (
    <nav aria-label={translate("Main navigation")} className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {sections.map((section) => (
        <div key={section.title} className="space-y-1">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-sidebar-foreground/50 uppercase">
            {translate(section.title)}
          </p>
          {section.items.map((item) => {
            const isActive = isNavItemActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--sidebar-primary)]"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                {createElement(getIconComponent(item.icon), { className: "size-4 shrink-0", "aria-hidden": true })}
                {translate(item.title)}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
};

export default SidebarNav;
