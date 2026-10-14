"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export const LEGAL_PAGES = [
  { href: "/terms", label: "Terms of use" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/refund-policy", label: "Refund policy" },
  { href: "/faq", label: "Common questions" },
] as const;

// The side menu of the public legal pages.
const LegalNav = () => {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <nav aria-label={t("Legal")} className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
      {LEGAL_PAGES.map((page) => {
        const on = pathname === page.href;
        return (
          <Link
            key={page.href}
            href={page.href}
            aria-current={on ? "page" : undefined}
            className={cn("flex h-10 shrink-0 items-center rounded-md px-3 text-body whitespace-nowrap transition-colors", on ? "bg-mint-50 font-semibold text-brand-ink" : "font-medium text-ink-2 hover:bg-surface-sunken")}
          >
            {t(page.label)}
          </Link>
        );
      })}
    </nav>
  );
};

export default LegalNav;
