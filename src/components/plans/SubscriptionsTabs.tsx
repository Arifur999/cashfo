"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/t";

const TABS = [
  { label: t("Plans"), href: "/admin/plans" },
  { label: t("Coupons"), href: "/admin/coupons" },
];

export function SubscriptionsTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-neutral-200">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              isActive ? "border-brand-primary text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-700",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
