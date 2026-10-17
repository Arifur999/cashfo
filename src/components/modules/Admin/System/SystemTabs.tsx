"use client";

import { useQuery } from "@tanstack/react-query";
import TabsNav from "@/components/shared/TabsNav";
import { openErrorCountQuery } from "@/queries/system.queries";

// The design's four tabs; Errors carries an amber count of what isn't fixed.
const SystemTabs = () => {
  const openErrors = useQuery(openErrorCountQuery()).data?.meta?.total;

  return (
    <TabsNav
      label="System"
      tabs={[
        { label: "Health and backups", href: "/admin/system", exact: true },
        { label: "Feature flags", href: "/admin/system/feature-flags" },
        { label: "Errors", href: "/admin/system/errors", count: openErrors || undefined, countTone: "warning" },
        { label: "Rate limits", href: "/admin/system/rate-limits" },
      ]}
    />
  );
};

export default SystemTabs;
