import LegalPageView from "@/components/modules/Legal/LegalPageView";
import { legalPageEntry } from "@/components/modules/Legal/legalPages";
import { publicPageTitle } from "@/components/modules/Legal/publicPageTitle";

// Named as its heading and every link to it name it.
export const generateMetadata = publicPageTitle(legalPageEntry("terms").label);
// The text is edited in the admin panel; always read the current version.
export const dynamic = "force-dynamic";

export default function TermsPage() {
  return <LegalPageView page="terms" />;
}
