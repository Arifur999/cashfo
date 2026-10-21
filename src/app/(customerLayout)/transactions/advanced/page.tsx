import { JournalEntryPageClient } from "@/components/modules/Customer/Books/Journal/JournalEntryPageClient";
import { displayLanguage } from "@/lib/customer/accountDisplay";
import { getAccounts } from "@/lib/customer/accounts";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { requireBusinessWorkspace } from "@/lib/customer/requireBusinessWorkspace";
import { getLocale } from "@/lib/i18n/locale";

export const generateMetadata = () => customerPageMetadata("/transactions/advanced");

// Books › New journal entry: the raw double-entry form for postings the
// sale, purchase, payment and transfer buttons don't cover. Only a business
// workspace has Books; any other shows the way to one.
export default async function JournalEntryPage() {
  const books = await requireBusinessWorkspace();
  if (!books.ok) return books.notice;
  const { businessId: activeBusinessId, business: activeBusiness } = books;

  const [groups, locale] = await Promise.all([getAccounts(activeBusinessId), getLocale()]);

  return <JournalEntryPageClient businessId={activeBusinessId} groups={groups} preferredLanguage={displayLanguage(locale)} currency={activeBusiness.currency} />;
}
