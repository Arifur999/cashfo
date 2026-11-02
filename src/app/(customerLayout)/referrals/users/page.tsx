import { ReferredUsersClient } from "@/components/modules/Customer/Referrals/ReferredUsersClient";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { friendTabOf } from "@/lib/customer/referralDisplay";
import { referralInfoForPage, referralPageContext } from "@/lib/customer/referralPage";
import { getReferredFriends } from "@/lib/customer/referrals";
import { readPageParam } from "@/lib/table/pageParams";

export const generateMetadata = () => customerPageMetadata("/referrals/users");

// Referrals > Referred users: ?tab=PAYING|FREE|ENDED, ?q= a name, ?page=.
export default async function ReferredUsersPage({ searchParams }: PageProps<"/referrals/users">) {
  const params = await searchParams;
  const tab = friendTabOf(typeof params.tab === "string" ? params.tab : null);
  const search = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const { currency, today } = await referralPageContext();
  const [info, list] = await Promise.all([referralInfoForPage(), getReferredFriends(readPageParam(params), tab === "ALL" ? undefined : tab, search)]);
  return <ReferredUsersClient list={list} tab={tab} search={search} currency={currency} today={today} canRemind={info?.program.live ?? false} />;
}
