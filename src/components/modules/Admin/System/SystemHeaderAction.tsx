"use client";

import { usePathname } from "next/navigation";
import CreateFeatureFlagButton from "./FeatureFlags/CreateFeatureFlagButton";

// The layout draws one header for every System tab; only Feature flags has
// something to make from up there.
const SystemHeaderAction = () => {
  const pathname = usePathname();
  return pathname === "/admin/system/feature-flags" ? <CreateFeatureFlagButton /> : null;
};

export default SystemHeaderAction;
