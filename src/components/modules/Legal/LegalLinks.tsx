"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/faq", label: "FAQ" },
] as const;

// The admin-maintained legal pages (Admin > Content > Legal), linked from
// the sign-in pages and every public page.
const LegalLinks = ({ className = "" }: { className?: string }) => {
  const { t } = useLocale();
  return (
    <nav aria-label={t("Legal")} className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground ${className}`}>
      {LEGAL_LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="hover:text-foreground hover:underline">
          {t(link.label)}
        </Link>
      ))}
    </nav>
  );
};

export default LegalLinks;
