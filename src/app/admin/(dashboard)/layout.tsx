import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";

export default async function DashboardLayout({ children }: LayoutProps<"/admin">) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <LocaleProvider>
      <div className="flex min-h-screen">
        <Sidebar role={admin.role} />
        <div className="flex flex-1 flex-col">
          <TopBar adminName={admin.name} />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </LocaleProvider>
  );
}
