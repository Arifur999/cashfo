import LocalePill from "@/components/shared/LocalePill";
import UserMenu from "@/components/shared/UserMenu";
import { getNavSectionsByRole } from "@/lib/navItem";
import { getUserInfo } from "@/services/auth.services";
import AdminBreadcrumb from "./AdminBreadcrumb";
import AdminNotificationsBell from "./AdminNotificationsBell";
import AdminSearch from "./AdminSearch";
import MobileNav from "./MobileNav";

// The admin top bar: 64px, the breadcrumb, the search (Ctrl K), the
// language pill, the bell and the account menu.
const DashboardNavbar = async () => {
  const admin = await getUserInfo();
  if (!admin) {
    return null;
  }
  const sections = getNavSectionsByRole(admin.role);

  return (
    <header className="flex h-topbar-mobile shrink-0 items-center gap-2 border-b border-line bg-surface px-2 md:h-topbar md:gap-3 md:px-8 print:hidden">
      <MobileNav sections={sections} admin={admin} />
      <AdminBreadcrumb sections={sections} adminName={admin.name} />
      <AdminSearch />
      <div className="hidden md:block">
        <LocalePill />
      </div>
      <AdminNotificationsBell />
      <UserMenu name={admin.name} email={admin.email} role={admin.role} />
    </header>
  );
};

export default DashboardNavbar;
