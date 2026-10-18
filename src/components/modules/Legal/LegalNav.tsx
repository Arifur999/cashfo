"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { LEGAL_PAGES, type LegalVersions } from "./legalPages";

// The side menu of the public legal pages, each policy with its version.
const LegalNav = ({ versions }: { versions: LegalVersions }) => {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <nav aria-label={t("Legal")} className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
      {LEGAL_PAGES.map((page) => {
        const on = pathname === page.href;
        const version = versions[page.page];
        return (
          <Link
            key={page.href}
            href={page.href}
            aria-current={on ? "page" : undefined}
            className={cn("flex h-10 shrink-0 items-center justify-between gap-3 rounded-md px-3 text-body whitespace-nowrap transition-colors", on ? "bg-mint-50 font-semibold text-brand-ink" : "font-medium text-ink-2 hover:bg-surface-sunken")}
          >
            {t(page.label)}
            {version !== undefined && <span className="text-caption font-medium text-ink-muted">v{version}</span>}
          </Link>
        );
      })}
    </nav>
  );
};

export default LegalNav;
