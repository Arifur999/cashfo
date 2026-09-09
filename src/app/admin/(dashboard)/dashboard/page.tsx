import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { t } from "@/lib/i18n/t";

export default async function DashboardPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm shadow-black/5">
      <h1 className="text-xl font-semibold text-neutral-900">
        {t("Welcome,")} {admin.name}
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        {t("You're signed in as")} {admin.role.replaceAll("_", " ").toLowerCase()}.
      </p>
    </div>
  );
}
