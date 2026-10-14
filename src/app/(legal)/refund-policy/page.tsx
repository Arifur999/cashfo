import type { Metadata } from "next";
import LegalPageView from "@/components/modules/Legal/LegalPageView";

export const metadata: Metadata = { title: "Refund Policy" };
// The text is edited in the admin panel; always read the current version.
export const dynamic = "force-dynamic";

export default function RefundPolicyPage() {
  return <LegalPageView page="refund-policy" title="Refund Policy" />;
}
