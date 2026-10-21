"use client";

import { useQuery } from "@tanstack/react-query";
import Card from "@/components/smartly/Card";
import ErrorState from "@/components/smartly/ErrorState";
import SkeletonRows from "@/components/smartly/SkeletonRows";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { myAccountQuery } from "@/queries/myAccount.queries";
import ProfileCard from "./ProfileCard";
import { LanguageCard, PasswordCard, TwoStepCard } from "./SecurityCards";
import { DevicesCard, RecentSignInsCard } from "./SignInCards";

const CardPlaceholder = ({ rows }: { rows: number }) => (
  <Card padding="none" className="overflow-hidden">
    <SkeletonRows rows={rows} />
  </Card>
);

// My account as the design lays it out: who you are, your password and
// language on the left; two-step sign-in, your devices and your recent
// sign-ins on the right. Until you are loaded the cards hold their places;
// if that fails, the page says so and offers a retry.
const MyAccountBoard = () => {
  const { translate } = useLocale();
  const query = useQuery(myAccountQuery());
  const me = query.data?.data;

  if (!me) {
    return query.isError ? (
      <ErrorState title={translate("Couldn't load your account")} onRetry={() => void query.refetch()} />
    ) : (
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <CardPlaceholder rows={3} />
          <CardPlaceholder rows={1} />
        </div>
        <div className="flex flex-col gap-4">
          <CardPlaceholder rows={1} />
          <CardPlaceholder rows={2} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <ProfileCard me={me} />
        <PasswordCard me={me} />
        <LanguageCard />
      </div>
      <div className="flex flex-col gap-4">
        <TwoStepCard me={me} />
        <DevicesCard />
        <RecentSignInsCard />
      </div>
    </div>
  );
};

export default MyAccountBoard;
