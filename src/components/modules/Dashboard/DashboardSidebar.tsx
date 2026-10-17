import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { getNavSectionsByRole, navBadgesFor } from "@/lib/navItem";
import { prefetchNavBadge } from "@/queries/navBadge.queries";
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

  const sections = getNavSectionsByRole(admin.role);
  // The menu's counts arrive with the page instead of popping in after it.
  const badges = navBadgesFor(sections, admin.role);

  return (
    <aside className="sticky top-0 hidden h-screen w-sidebar-admin shrink-0 flex-col bg-night-panel px-3 pt-5 pb-4 text-white lg:flex print:hidden">
      <SidebarBrand />
      <QueryPrefetch prefetch={(client) => Promise.all(badges.map((kind) => prefetchNavBadge[kind](client)))}>
        <SidebarNav sections={sections} role={admin.role} />
      </QueryPrefetch>
      <SidebarFoot admin={admin} />
    </aside>
  );
};

export default DashboardSidebar;
