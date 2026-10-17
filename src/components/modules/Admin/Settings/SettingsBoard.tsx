"use client";

import { useQuery } from "@tanstack/react-query";
import { platformSettingsQuery } from "@/queries/settings.queries";
import GeneralSettingsCard from "./GeneralSettingsCard";
import SettingsSideCards from "./SettingsSideCards";

// Settings as the design lays it out: General on the left, the related
// settings and where to change them on the right.
const SettingsBoard = ({ canManage }: { canManage: boolean }) => {
  const settings = useQuery(platformSettingsQuery()).data?.data;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      {settings ? <GeneralSettingsCard settings={settings} canManage={canManage} /> : <div />}
      <SettingsSideCards canManage={canManage} />
    </div>
  );
};

export default SettingsBoard;
