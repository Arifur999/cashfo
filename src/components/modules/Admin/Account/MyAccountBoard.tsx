"use client";

import { useQuery } from "@tanstack/react-query";
import { myAccountQuery } from "@/queries/myAccount.queries";
import ProfileCard from "./ProfileCard";
import { LanguageCard, PasswordCard, TwoStepCard } from "./SecurityCards";
import { DevicesCard, RecentSignInsCard } from "./SignInCards";

// My account as the design lays it out: who you are, your password and
// language on the left; two-step sign-in, your devices and your recent
// sign-ins on the right.
const MyAccountBoard = () => {
  const me = useQuery(myAccountQuery()).data?.data;
  if (!me) return null;

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
