"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { LEGAL_PAGES, type LegalVersions } from "./legalPages";

// The side menu of the public legal pages, each policy with its version.
// Phones get all four as a 2×2 grid, tablets one wrapping row, so the page
// that is open is always in sight -- a sideways scroller hid it off-screen.
const LegalNav = ({ versions }: { versions: LegalVersions }) => {
  const pathname = usePathname();
  const { locale, t } = useLocale();

  return (
    <nav aria-label={t("Legal")} className="grid grid-cols-2 gap-1 md:flex md:flex-row md:flex-wrap lg:flex-col">
      {LEGAL_PAGES.map((page) => {
        const on = pathname === page.href;
        const version = versions[page.page];
        return (
          <Link
            key={page.href}
            href={page.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              // 44px to tap below lg; a long Bangla name may take two lines
              // in a phone's half-width cell rather than be cut.
              "flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-body leading-snug transition-colors lg:min-h-10 lg:gap-3 lg:py-0 lg:whitespace-nowrap",
              on ? "bg-mint-50 font-semibold text-brand-ink" : "font-medium text-ink-2 hover:bg-surface-sunken",
            )}
          >
            <span className="min-w-0">{t(page.label)}</span>
            {version !== undefined && <span className="shrink-0 text-caption font-medium text-ink-muted">v{formatCount(version, locale)}</span>}
          </Link>
        );
      })}
    </nav>
  );
};

export default LegalNav;
