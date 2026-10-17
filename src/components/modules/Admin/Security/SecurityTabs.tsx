"use client";

import { useQuery } from "@tanstack/react-query";
import TabsNav from "@/components/shared/TabsNav";
import { securityFlagsSummaryQuery } from "@/queries/security.queries";

// The design's five tabs; "Suspicious activity" carries a red count of the
// flags that still need a look.
const SecurityTabs = () => {
  const needsLook = useQuery(securityFlagsSummaryQuery()).data?.data.needsLook;

  return (
    <TabsNav
      label="Security"
      tabs={[
        { label: "Audit log", href: "/admin/security", exact: true },
        { label: "Sign-ins", href: "/admin/security/logins" },
        { label: "Suspicious activity", href: "/admin/security/flags", count: needsLook || undefined, countTone: "danger" },
        { label: "Admin team", href: "/admin/security/admins" },
        { label: "Roles", href: "/admin/security/roles" },
      ]}
    />
  );
};

export default SecurityTabs;
