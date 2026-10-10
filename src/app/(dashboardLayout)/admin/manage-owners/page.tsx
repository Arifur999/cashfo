import Link from "next/link";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { getOwnerOverview } from "@/lib/owners";
import { OwnerRowActions } from "@/components/owners/OwnerRowActions";
import { cn } from "@/lib/utils";
import type { OwnerOverviewItem } from "@/lib/api";
import { t } from "@/lib/i18n/t";

interface ManageOwnersPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

const STATUS_STYLES: Record<OwnerOverviewItem["status"], string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-orange-100 text-orange-700",
  DELETED: "bg-neutral-200 text-neutral-600",
};

const STATUS_LABELS: Record<OwnerOverviewItem["status"], string> = {
  ACTIVE: t("Active"),
  SUSPENDED: t("Suspended"),
  DELETED: t("Deleted"),
};

export default async function ManageOwnersPage({ searchParams }: ManageOwnersPageProps) {
  const params = await searchParams;
  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  const search = params.search?.trim() ?? "";
  const limit = 20;

  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) query.set("search", search);

  const [{ items, totalCount }, admin] = await Promise.all([getOwnerOverview(query.toString()), getCurrentAdmin()]);
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
  const isSuperAdmin = admin?.role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("Manage Owners")}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t("View every real owner's account and, if needed, reset their workspace's business/financial data to a clean slate.")}
        </p>
      </div>

      <form method="GET" className="flex gap-2">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder={t("Search by name, business, email, phone...")}
          className="w-full max-w-sm rounded-xl border border-neutral-200 px-3.5 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        />
        <button
          type="submit"
          className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          {t("Search")}
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Owner")}</th>
              <th className="px-4 py-3 font-medium">{t("Workspace")}</th>
              <th className="px-4 py-3 font-medium">{t("Active Plan")}</th>
              <th className="px-4 py-3 font-medium">{t("Days Using")}</th>
              <th className="px-4 py-3 font-medium">{t("Status")}</th>
              <th className="px-4 py-3 font-medium">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {items.map((item) => (
              <tr key={item.userId} className="hover:bg-neutral-50/60">
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">{item.name}</p>
                  <p className="text-neutral-500">{item.email}</p>
                  {item.phone && <p className="text-neutral-400">{item.phone}</p>}
                </td>
                <td className="px-4 py-3 text-neutral-500">{item.businessName ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-500">{item.planName ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-500">{item.daysUsing}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[item.status])}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {isSuperAdmin && item.businessId && (
                    <OwnerRowActions userId={item.userId} ownerName={item.name} businessName={item.businessName ?? ""} />
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                  {t("No owners found.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm shadow-sm shadow-black/5">
        <span className="text-neutral-500">
          {t("Page")} {page} {t("of")} {totalPages} &middot; {totalCount} {t("total")}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={`/admin/manage-owners?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-600 hover:bg-neutral-50"
            >
              {t("Previous")}
            </Link>
          ) : (
            <span className="rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-300">{t("Previous")}</span>
          )}
          {page < totalPages ? (
            <Link
              href={`/admin/manage-owners?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-600 hover:bg-neutral-50"
            >
              {t("Next")}
            </Link>
          ) : (
            <span className="rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-300">{t("Next")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
