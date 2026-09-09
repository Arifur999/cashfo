import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { logoutAction } from "@/lib/authActions";
import { Sidebar } from "@/components/layout/Sidebar";
import { t } from "@/lib/i18n/t";

export default async function DashboardLayout({ children }: LayoutProps<"/admin">) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={admin.role} />
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-black/5 bg-white px-6">
          <span className="text-sm text-neutral-500">
            {t("Welcome back,")} <span className="font-medium text-neutral-900">{admin.name}</span>
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-xl bg-brand-danger px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-danger-hover"
            >
              {t("Log out")}
            </button>
          </form>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
