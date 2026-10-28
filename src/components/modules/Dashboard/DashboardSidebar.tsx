import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { getNavSectionsByRole, navBadgesFor } from "@/lib/navItem";
import { prefetchNavBadge } from "@/queries/navBadge.queries";
import { getUserInfo } from "@/services/auth.services";
import SidebarBrand from "./SidebarBrand";
import SidebarFoot from "./SidebarFoot";
import SidebarNav from "./SidebarNav";

// The admin's sidebar as the AdminSidebar board draws it: a 240px deep-teal
// panel floating 12px off the window's edges with 22px corners, the brand
// on top, this role's menu and who is signed in at the foot. Async Server
// Component that fetches, then hands plain props to the client nav.
// getUserInfo is request-cached, so this shares the layout's round trip.
const DashboardSidebar = async () => {
  const admin = await getUserInfo();
  if (!admin) {
    return null;
  }

  const sections = getNavSectionsByRole(admin.role);
  // The menu's counts arrive with the page instead of popping in after it.
  const badges = navBadgesFor(sections, admin.role);

  return (
    <aside className="sticky top-0 hidden h-screen shrink-0 py-3 pl-3 lg:flex print:hidden">
      <div className="flex w-sidebar-admin flex-col overflow-hidden rounded-panel bg-forest px-3 py-4 text-white">
        <SidebarBrand />
        <QueryPrefetch prefetch={(client) => Promise.all(badges.map((kind) => prefetchNavBadge[kind](client)))}>
          <SidebarNav sections={sections} role={admin.role} />
        </QueryPrefetch>
        <SidebarFoot admin={admin} />
      </div>
    </aside>
  );
};

export default DashboardSidebar;
