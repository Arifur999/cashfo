"use client";

import { useQuery } from "@tanstack/react-query";
import Card from "@/components/smartly/Card";
import ErrorState from "@/components/smartly/ErrorState";
import SkeletonRows from "@/components/smartly/SkeletonRows";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { platformSettingsQuery } from "@/queries/settings.queries";
import ConnectedServicesCard from "./ConnectedServicesCard";
import GeneralSettingsCard from "./GeneralSettingsCard";
import HelpCompanyCard from "./HelpCompanyCard";
import HelpVideosCard from "./HelpVideosCard";
import PaymentAccountsCard from "./PaymentAccountsCard";
import SettingsSideCards from "./SettingsSideCards";
import SignupsCard from "./SignupsCard";
import ZakatPricesCard from "./ZakatPricesCard";

// Settings as the v16 board lays it out: General, the Help page's company
// card, New sign-ups and the connected services on the left (then the
// payment accounts and zakat prices, which the board doesn't draw), what
// users see on the Help page and where the related settings change on the
// right, and the video guides across the foot. Until the settings load the
// General card holds its place; if they can't be, it says so and offers a
// retry. Only a super admin changes them -- and only a super admin may read
// the services' health, so canManage covers both.
const SettingsBoard = ({ canManage, canManageZakat }: { canManage: boolean; canManageZakat: boolean }) => {
  const { translate } = useLocale();
  const query = useQuery(platformSettingsQuery());
  const settings = query.data?.data;
  const loadFailed = !settings && query.isError;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          {settings ? (
            <GeneralSettingsCard settings={settings} canManage={canManage} />
          ) : loadFailed ? (
            <ErrorState title={translate("Couldn't load the settings")} onRetry={() => void query.refetch()} />
          ) : (
            <Card padding="none" className="overflow-hidden">
              <SkeletonRows rows={4} avatar={false} />
            </Card>
          )}
          <HelpCompanyCard canManage={canManage} />
          {settings && <SignupsCard open={settings.signupsOpen} canManage={canManage} />}
          <ConnectedServicesCard canCheck={canManage} />
          {/* A new form when fresh accounts arrive, so it starts from them. */}
          {settings && <PaymentAccountsCard key={JSON.stringify(settings.billingPaymentAccounts ?? null)} accounts={settings.billingPaymentAccounts} canManage={canManage} />}
          <ZakatPricesCard canManage={canManageZakat} />
        </div>
        <SettingsSideCards canManage={canManage} settings={settings} loadFailed={loadFailed} />
      </div>
      <HelpVideosCard canManage={canManage} />
    </div>
  );
};

export default SettingsBoard;
