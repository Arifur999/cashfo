import type { Metadata } from "next";
import RolesMatrix from "@/components/modules/Admin/Security/Roles/RolesMatrix";

export const metadata: Metadata = { title: "Roles" };

// Read-only: worked out from the panel's own permission tables.
const RolesPage = () => {
  return <RolesMatrix />;
};

export default RolesPage;
