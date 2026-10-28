"use client";

import { useQuery } from "@tanstack/react-query";
import Card from "@/components/smartly/Card";
import ErrorState from "@/components/smartly/ErrorState";
import SkeletonRows from "@/components/smartly/SkeletonRows";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { platformSettingsQuery } from "@/queries/settings.queries";
import ConnectedServicesCard from "./ConnectedServicesCard";
import GeneralSettingsCard from "./GeneralSettingsCard";
import SettingsSideCards from "./SettingsSideCards";
import SignupsCard from "./SignupsCard";

// Settings as the design lays it out: General, New sign-ups and the
// connected services on the left, the related settings and where to change
// them on the right. Until the settings load the General card holds its
// place; if they can't be, it says so and offers a retry. Only a super
// admin changes them -- and only a super admin may read the services'
// health, so canManage covers both.
const SettingsBoard = ({ canManage }: { canManage: boolean }) => {
  const { translate } = useLocale();
  const query = useQuery(platformSettingsQuery());
  const settings = query.data?.data;
  const loadFailed = !settings && query.isError;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-4">
        {settings ? (
          <>
            <GeneralSettingsCard settings={settings} canManage={canManage} />
            <SignupsCard open={settings.signupsOpen} canManage={canManage} />
          </>
        ) : loadFailed ? (
          <ErrorState title={translate("Couldn't load the settings")} onRetry={() => void query.refetch()} />
        ) : (
          <Card padding="none" className="overflow-hidden">
            <SkeletonRows rows={4} avatar={false} />
          </Card>
        )}
        <ConnectedServicesCard canCheck={canManage} />
      </div>
      <SettingsSideCards canManage={canManage} settings={settings} loadFailed={loadFailed} />
    </div>
  );
};

export default SettingsBoard;
