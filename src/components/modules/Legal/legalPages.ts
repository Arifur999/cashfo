import type { LegalPage } from "@/lib/customer/platform";

// The public legal pages, in their side menu's order. Plain data, so the
// server shell can read it as well as the menu.
export const LEGAL_PAGES: readonly { page: LegalPage; href: string; label: string }[] = [
  { page: "terms", href: "/terms", label: "Terms of use" },
  { page: "privacy", href: "/privacy", label: "Privacy policy" },
  { page: "refund-policy", href: "/refund-policy", label: "Refund policy" },
  { page: "faq", href: "/faq", label: "Common questions" },
];
