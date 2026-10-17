import RolesMatrix from "@/components/modules/Admin/Security/Roles/RolesMatrix";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Roles");

// Read-only: worked out from the panel's own permission tables.
const RolesPage = () => {
  return <RolesMatrix />;
};

export default RolesPage;
