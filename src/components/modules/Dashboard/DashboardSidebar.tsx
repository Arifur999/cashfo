import { getNavSectionsByRole } from "@/lib/navItem";
import { getUserInfo } from "@/services/auth.services";
import SidebarBrand from "./SidebarBrand";
import SidebarFoot from "./SidebarFoot";
import SidebarNav from "./SidebarNav";

// The admin's Night sidebar, 240px: the logo with the Admin tag, the menu
// for this role, and who is signed in at the foot. Async Server Component
// that fetches, then hands plain props to the client nav. getUserInfo is
// request-cached, so this shares the layout's round trip.
const DashboardSidebar = async () => {
  const admin = await getUserInfo();
  if (!admin) {
    return null;
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-sidebar-admin shrink-0 flex-col bg-night-panel px-3 pt-5 pb-4 text-white lg:flex print:hidden">
      <SidebarBrand />
      <SidebarNav sections={getNavSectionsByRole(admin.role)} role={admin.role} />
      <SidebarFoot admin={admin} />
    </aside>
  );
};

export default DashboardSidebar;
