import { JournalEntryPageClient } from "@/components/modules/Customer/Books/Journal/JournalEntryPageClient";
import { displayLanguage } from "@/lib/customer/accountDisplay";
import { getAccounts } from "@/lib/customer/accounts";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { requireBusinessWorkspace } from "@/lib/customer/requireBusinessWorkspace";
import { getLocale } from "@/lib/i18n/locale";

export const generateMetadata = () => customerPageMetadata("/transactions/advanced");

// Books › New journal entry: the raw double-entry form for postings the
// sale, purchase, payment and transfer buttons don't cover. Only a business
// workspace has Books; any other shows the way to one. Only the owner or an
// accountant may post one (the API says so too), so staff see the form set
// back with why, before filling it in for nothing.
export default async function JournalEntryPage() {
  const books = await requireBusinessWorkspace();
  if (!books.ok) return books.notice;
  const { businessId: activeBusinessId, business: activeBusiness } = books;

  const [groups, locale] = await Promise.all([getAccounts(activeBusinessId), getLocale()]);
  const canManage = activeBusiness.role === "OWNER" || activeBusiness.role === "ACCOUNTANT";

  return <JournalEntryPageClient businessId={activeBusinessId} groups={groups} preferredLanguage={displayLanguage(locale)} currency={activeBusiness.currency} canManage={canManage} />;
}
