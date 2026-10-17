import type { Metadata } from "next";
import MyAccountBoard from "@/components/modules/Admin/Account/MyAccountBoard";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { myAccountQuery, mySessionsQuery, mySignInsQuery } from "@/queries/myAccount.queries";

export const metadata: Metadata = { title: "My account" };

// Every admin's own page, whatever their role.
const MyAccountPage = () => {
  return (
    <div className="space-y-4">
      <PageHeader title="My account" description="Your own sign-in details. Every change here is written to the audit log." />
      <QueryPrefetch
        prefetch={(client) => Promise.all([client.prefetchQuery(myAccountQuery()), client.prefetchQuery(mySessionsQuery()), client.prefetchQuery(mySignInsQuery())])}
      >
        <MyAccountBoard />
      </QueryPrefetch>
    </div>
  );
};

export default MyAccountPage;
