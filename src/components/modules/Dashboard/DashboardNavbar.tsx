import UserMenu from "@/components/shared/UserMenu";
import { getNavSectionsByRole } from "@/lib/navItem";
import { getUserInfo } from "@/services/auth.services";
import AdminBreadcrumb from "./AdminBreadcrumb";
import AdminLanguageButton from "./AdminLanguageButton";
import AdminNotificationsBell from "./AdminNotificationsBell";
import AdminSearch from "./AdminSearch";
import MobileNav from "./MobileNav";

// The admin top bar, as the AdminTopbar board draws it: 64px on the page's
// own ground (no bar of its own), the breadcrumb, then white pills -- the
// search (Ctrl K), the language, the bell and the account menu, which holds
// Log out. Phones keep the same controls as 44px icons beside the menu
// button, with a tighter gap that leaves the page's name room.
const DashboardNavbar = async () => {
  const admin = await getUserInfo();
  if (!admin) {
    return null;
  }
  const sections = getNavSectionsByRole(admin.role);

  return (
    <header className="flex h-topbar-mobile shrink-0 items-center gap-1 border-b border-line bg-surface px-2 md:h-topbar md:gap-3 md:border-none md:bg-transparent md:px-7 print:hidden">
      <MobileNav sections={sections} admin={admin} />
      <AdminBreadcrumb sections={sections} adminName={admin.name} />
      <AdminSearch />
      <AdminLanguageButton />
      <AdminNotificationsBell />
      <UserMenu name={admin.name} email={admin.email} role={admin.role} />
    </header>
  );
};

export default DashboardNavbar;
