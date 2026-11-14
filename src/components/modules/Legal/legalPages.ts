import type { LegalPage } from "@/lib/customer/platform";

export interface LegalPageEntry {
  page: LegalPage;
  href: string;
  // The page's one name: its heading, tab title, side menu entry and every
  // link to it.
  label: string;
  versioned: boolean;
}

// The public legal pages, in their side menu's order. Plain data, so the
// server shell can read it as well as the menu. The policies show their
// version in the menu; the questions page changes too often for one to help.
export const LEGAL_PAGES: readonly LegalPageEntry[] = [
  { page: "terms", href: "/terms", label: "Terms of service", versioned: true },
  { page: "privacy", href: "/privacy", label: "Privacy policy", versioned: true },
  { page: "refund-policy", href: "/refund-policy", label: "Refund policy", versioned: true },
  { page: "cookie-policy", href: "/cookie-policy", label: "Cookie policy", versioned: true },
  { page: "community-rules", href: "/community-rules", label: "Community rules for groups", versioned: true },
  { page: "faq", href: "/faq", label: "Common questions", versioned: false },
];

export const legalPageEntry = (page: LegalPage): LegalPageEntry => LEGAL_PAGES.find((entry) => entry.page === page) ?? { page, href: `/${page}`, label: "Legal", versioned: false };

export type LegalVersions = Partial<Record<LegalPage, number>>;
