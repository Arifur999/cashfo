import type { LegalPage } from "@/lib/customer/platform";

// The public legal pages, in their side menu's order. Plain data, so the
// server shell can read it as well as the menu. The policies show their
// version in the menu; the questions page changes too often for one to help.
export const LEGAL_PAGES: readonly { page: LegalPage; href: string; label: string; versioned: boolean }[] = [
  { page: "terms", href: "/terms", label: "Terms of use", versioned: true },
  { page: "privacy", href: "/privacy", label: "Privacy policy", versioned: true },
  { page: "refund-policy", href: "/refund-policy", label: "Refund policy", versioned: true },
  { page: "faq", href: "/faq", label: "Common questions", versioned: false },
];

export type LegalVersions = Partial<Record<LegalPage, number>>;
