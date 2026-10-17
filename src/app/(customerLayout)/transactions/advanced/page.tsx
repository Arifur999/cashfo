import { redirect } from "next/navigation";
import { JournalEntryPageClient } from "@/components/modules/Customer/Books/Journal/JournalEntryPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { displayLanguage } from "@/lib/customer/accountDisplay";
import { getAccounts } from "@/lib/customer/accounts";
import { getCurrentUser } from "@/lib/customer/auth";
import { getLocale } from "@/lib/i18n/locale";

// Books › New journal entry: the raw double-entry form for postings the
// sale, purchase, payment and transfer buttons don't cover.
export default async function JournalEntryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const [groups, locale] = await Promise.all([getAccounts(activeBusinessId), getLocale()]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);

  return <JournalEntryPageClient businessId={activeBusinessId} groups={groups} preferredLanguage={displayLanguage(locale)} currency={activeBusiness?.currency ?? "BDT"} />;
}
