"use client";

import { usePathname } from "next/navigation";
import CreateAdminDialog from "./Admins/CreateAdminDialog";
import CheckNow from "./Flags/CheckNow";

// The layout draws one header for every Security tab: the admin team adds
// people from up there, and suspicious activity runs its check.
const SecurityHeaderAction = () => {
  const pathname = usePathname();
  if (pathname === "/admin/security/admins") {
    return <CreateAdminDialog />;
  }
  if (pathname === "/admin/security/flags") {
    return <CheckNow />;
  }
  return null;
};

export default SecurityHeaderAction;
