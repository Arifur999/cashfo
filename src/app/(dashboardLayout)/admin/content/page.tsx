import { getCurrentAdmin } from "@/lib/adminAuth";
import { getAccountTemplates, getAnnouncements, getCategories, getLegalDocuments, getTranslations } from "@/lib/content";
import { ContentPageClient } from "@/components/content/ContentPageClient";

export default async function ContentPage() {
  const [templates, categories, translations, announcements, legalDocuments, admin] = await Promise.all([
    getAccountTemplates(),
    getCategories(),
    getTranslations(""),
    getAnnouncements(),
    getLegalDocuments(),
    getCurrentAdmin(),
  ]);

  const canManage = admin?.role === "SUPER_ADMIN" || admin?.role === "CONTENT_ADMIN";

  return (
    <ContentPageClient
      templates={templates}
      categories={categories}
      translations={translations}
      announcements={announcements}
      legalDocuments={legalDocuments}
      canManage={canManage}
    />
  );
}
