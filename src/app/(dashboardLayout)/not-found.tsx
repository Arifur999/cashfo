import Link from "next/link";
import { SearchX } from "lucide-react";
import { t } from "@/lib/i18n/t";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-16 text-center shadow-sm shadow-black/5">
      <SearchX className="h-10 w-10 text-neutral-300" />
      <h1 className="mt-4 text-lg font-semibold text-neutral-900">{t("Not found")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("The page or record you're looking for doesn't exist.")}</p>
      <Link
        href="/admin/dashboard"
        className="mt-5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
      >
        {t("Back to Dashboard")}
      </Link>
    </div>
  );
}
