import { getOwnerOverview } from "@/lib/owners";
import { getSubscriptionPlanOptions } from "@/lib/subscriptionPlans";
import { UsersListClient } from "@/components/users/UsersListClient";
import { t } from "@/lib/i18n/t";

interface UsersPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;

  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined) as [string, string][],
  ).toString();

  const [{ items, page, limit, totalCount }, plans] = await Promise.all([
    getOwnerOverview(queryString),
    getSubscriptionPlanOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("User Management")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("View and manage the platform's real registered owners.")}</p>
      </div>
      <UsersListClient owners={items} page={page} limit={limit} totalCount={totalCount} plans={plans} />
    </div>
  );
}
