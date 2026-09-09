"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/t";

interface NavItem {
  label: string;
  href: string | null;
  // Extra path prefixes that should also highlight this item (e.g. a section
  // with more than one page, like Subscriptions covering both /plans and
  // /coupons). Defaults to just [href].
  activeMatch?: string[];
}

// Dashboard (Prompt 1), User Management (Prompt 2), Subscriptions
// (Prompt 3), Payments (Prompt 4), Content (Prompt 5), Support (Prompt 6),
// and Analytics (Prompt 7) are wired up -- the rest are styled placeholders
// (their own prompts build out the real pages).
const NAV_ITEMS: NavItem[] = [
  { label: t("Dashboard"), href: "/admin/dashboard" },
  { label: t("User Management"), href: "/admin/users" },
  { label: t("Subscriptions"), href: "/admin/plans", activeMatch: ["/admin/plans", "/admin/coupons"] },
  { label: t("Payments"), href: "/admin/payments", activeMatch: ["/admin/payments", "/admin/invoices"] },
  { label: t("Content"), href: "/admin/content" },
  { label: t("Support"), href: "/admin/support", activeMatch: ["/admin/support", "/admin/feature-requests"] },
  { label: t("Analytics"), href: "/admin/analytics" },
  { label: t("Security"), href: null },
  { label: t("Settings"), href: null },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-brand-dark text-white">
      <div className="flex h-16 items-center px-6 text-lg font-semibold tracking-wide">{t("Admin Panel")}</div>
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {NAV_ITEMS.map((item) => {
          if (!item.href) {
            return (
              <div
                key={item.label}
                aria-disabled="true"
                title={t("Coming soon")}
                className="flex select-none items-center rounded-lg px-4 py-2.5 text-sm text-white/40 cursor-not-allowed"
              >
                {item.label}
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
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
