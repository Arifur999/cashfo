"use client";

import Link from "next/link";
import type { LegalPage } from "@/lib/customer/platform";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { LEGAL_PAGES, legalPageEntry } from "./legalPages";

interface LegalPageLinkProps {
  page: LegalPage;
  // In a new tab, so the page it was opened from keeps what was typed.
  newTab?: boolean;
  className?: string;
}

// One legal page, named as the page itself is named (legalPages.ts).
export const LegalPageLink = ({ page, newTab = false, className }: LegalPageLinkProps) => {
  const { t } = useLocale();
  const entry = legalPageEntry(page);
  return (
    <Link href={entry.href} target={newTab ? "_blank" : undefined} rel={newTab ? "noopener noreferrer" : undefined} className={className}>
      {t(entry.label)}
      {newTab && <span className="sr-only"> {t("(opens in a new tab)")}</span>}
    </Link>
  );
};

// The admin-maintained legal pages (Admin > Content > Legal), at the foot of
// the sign-in pages: each 44px tall to tap. Two by two on a phone, where the
// four don't fit one line and a wrapped one would leave the last alone.
const LegalLinks = ({ newTab = false, className }: { newTab?: boolean; className?: string }) => {
  const { t } = useLocale();
  return (
    <nav aria-label={t("Legal")} className={cn("grid grid-cols-2 justify-items-center gap-x-3 text-caption text-ink-muted sm:flex sm:flex-wrap sm:items-center sm:justify-center", className)}>
      {LEGAL_PAGES.map((entry) => (
        <LegalPageLink key={entry.page} page={entry.page} newTab={newTab} className="inline-flex min-h-11 items-center rounded-sm px-1 hover:text-ink hover:underline" />
      ))}
    </nav>
  );
};

export default LegalLinks;
