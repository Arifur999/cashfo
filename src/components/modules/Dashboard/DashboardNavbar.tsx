import { getNavSectionsByRole } from "@/lib/navItem";
import { getUserInfo } from "@/services/auth.services";
import LocaleToggle from "@/components/shared/LocaleToggle";
import MobileNav from "./MobileNav";
import NavbarGreeting from "./NavbarGreeting";
import UserMenu from "@/components/shared/UserMenu";

const DashboardNavbar = async () => {
  const admin = await getUserInfo();
  if (!admin) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur md:px-6 print:hidden">
      <MobileNav sections={getNavSectionsByRole(admin.role)} />
      <NavbarGreeting name={admin.name} />
      <div className="ml-auto flex items-center gap-2">
        <LocaleToggle />
        <UserMenu name={admin.name} email={admin.email} role={admin.role} />
      </div>
    </header>
  );
};

export default DashboardNavbar;
