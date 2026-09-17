import Link from "next/link";
import { redirect } from "next/navigation";
import { JournalEntryForm } from "@/components/transactions/JournalEntryForm";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getAccounts } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";
import type { Account } from "@/lib/api";

function flatten(groups: { accounts: Account[] }[]): Account[] {
  const result: Account[] = [];
  function walk(accounts: Account[]) {
    for (const a of accounts) {
      result.push(a);
      if (a.children.length > 0) walk(a.children);
    }
  }
  for (const g of groups) walk(g.accounts);
  return result;
}

// Prompt 5's raw double-entry testing page, moved here (was /transactions/new)
// and demoted out of the primary flow now that Prompt 6's friendly Income/
// Expense/Transfer modals exist -- still useful for power users and for
// postings the three wrappers don't cover (e.g. multi-line journal entries).
export default async function AdvancedJournalEntryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const locale = await getLocale();
  const t = (key: string) => translate(locale, key);

  const groups = await getAccounts(activeBusinessId);
  const accounts = flatten(groups).filter((a) => a.status === "ACTIVE");

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <Link href="/transactions" className="text-sm text-neutral-400 hover:text-neutral-600 hover:underline">
        ← {t("Back to Activity")}
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-neutral-900">{t("Advanced: Raw Journal Entry")}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {t(
          "Direct double-entry posting -- uses Debit/Credit terminology on purpose, for power users and cases the friendly Income/Expense/Transfer forms don't cover.",
        )}
      </p>

      <div className="mt-6 max-w-3xl">
        <JournalEntryForm businessId={activeBusinessId} accounts={accounts} />
      </div>
    </div>
  );
}
