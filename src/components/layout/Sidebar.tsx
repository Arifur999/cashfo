"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminRole } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface NavItem {
  // Plain English key -- looked up through useLocale().translate() at
  // render time, not pre-translated here, since this array is built once at
  // module scope and can't itself react to a later locale change.
  label: string;
  href: string | null;
  // Extra path prefixes that should also highlight this item (e.g. a section
  // with more than one page, like Subscriptions covering both /plans and
  // /coupons). Defaults to just [href].
  activeMatch?: string[];
  // Omit to show to every role. Security is SUPER_ADMIN only -- the backend
  // already 403s every route under it (see security.module.ts), this just
  // keeps the link from being visible bait for roles that can't use it.
  roles?: AdminRole[];
}

// Dashboard (Prompt 1), User Management (Prompt 2), Subscriptions
// (Prompt 3), Payments (Prompt 4), Content (Prompt 5), Support (Prompt 6),
// Analytics (Prompt 7), Security (Prompt 8), System (Prompt 9), and
// Notifications (Prompt 10) are wired up -- the rest are styled placeholders
// (their own prompts build out the real pages).
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "User Management", href: "/admin/users" },
  { label: "Subscriptions", href: "/admin/plans", activeMatch: ["/admin/plans", "/admin/coupons"] },
  { label: "Payments", href: "/admin/payments", activeMatch: ["/admin/payments", "/admin/invoices"] },
  { label: "Content", href: "/admin/content" },
  { label: "Support", href: "/admin/support", activeMatch: ["/admin/support", "/admin/feature-requests"] },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "Security", href: "/admin/security", activeMatch: ["/admin/security"], roles: ["SUPER_ADMIN"] },
  { label: "System", href: "/admin/system", activeMatch: ["/admin/system"], roles: ["SUPER_ADMIN"] },
  { label: "Notifications", href: "/admin/notifications" },
  { label: "Settings", href: null },
];

interface SidebarProps {
  role: AdminRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { translate } = useLocale();
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-brand-dark text-white">
      <div className="flex h-16 items-center px-6 text-lg font-semibold tracking-wide">{translate("Admin Panel")}</div>
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {visibleNavItems.map((item) => {
          if (!item.href) {
            return (
              <div
                key={item.label}
                aria-disabled="true"
                title={translate("Coming soon")}
                className="flex select-none items-center rounded-lg px-4 py-2.5 text-sm text-white/40 cursor-not-allowed"
              >
                {translate(item.label)}
              </div>
            );
          }

          const isActive = (item.activeMatch ?? [item.href]).some((prefix) => pathname.startsWith(prefix));

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center rounded-lg border-l-4 px-4 py-2.5 text-sm transition-colors",
                isActive
                  ? "border-brand-primary bg-brand-dark-hover font-medium text-white"
                  : "border-transparent text-white/70 hover:bg-brand-dark-hover hover:text-white",
              )}
            >
              {translate(item.label)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
