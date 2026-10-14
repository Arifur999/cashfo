import type { Metadata } from "next";
import LegalPageView from "@/components/modules/Legal/LegalPageView";

export const metadata: Metadata = { title: "Terms of Service" };
// The text is edited in the admin panel; always read the current version.
export const dynamic = "force-dynamic";

export default function TermsPage() {
  return <LegalPageView page="terms" title="Terms of Service" />;
}
