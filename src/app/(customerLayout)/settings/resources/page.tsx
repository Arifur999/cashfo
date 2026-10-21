import { ResourcesSection } from "@/components/modules/Customer/Settings/ResourcesSection";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getLegalDocument } from "@/lib/customer/platform";
import { LEGAL_LINKS } from "@/lib/customer/settingsDisplay";

export const generateMetadata = () => customerPageMetadata("/settings/resources");

// Each legal page's last update is read here, for its "Updated" date.
export default async function SettingsResourcesPage() {
  const docs = await Promise.all(LEGAL_LINKS.map((link) => getLegalDocument(link.page)));
  const updated = Object.fromEntries(LEGAL_LINKS.map((link, i) => [link.page, docs[i]?.updatedAt ?? null]));
  return <ResourcesSection legalUpdated={updated} />;
}
