import { getNavSectionsByRole } from "@/lib/navItem";
import { getUserInfo } from "@/services/auth.services";
import SidebarBrand from "./SidebarBrand";
import SidebarNav from "./SidebarNav";

// Async Server Component that fetches, then hands plain props to the client
// nav. getUserInfo is request-cached, so this shares the layout's round trip.
const DashboardSidebar = async () => {
  const admin = await getUserInfo();
  if (!admin) {
    return null;
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex print:hidden">
      <SidebarBrand />
      <SidebarNav sections={getNavSectionsByRole(admin.role)} />
    </aside>
  );
};

export default DashboardSidebar;
