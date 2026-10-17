import type { Metadata } from "next";
import OwnerActivityTimeline from "@/components/modules/Admin/UserManagement/OwnerActivityTimeline";
import OwnerDetailActions from "@/components/modules/Admin/UserManagement/OwnerDetailActions";
import OwnerProfileHeader from "@/components/modules/Admin/UserManagement/OwnerProfileHeader";
import OwnerSummaryStats from "@/components/modules/Admin/UserManagement/OwnerSummaryStats";
import BackLink from "@/components/shared/BackLink";
import Callout from "@/components/shared/Callout";
import { fetchOrNotFound } from "@/lib/axios/fetchOrNotFound";
import { canManage } from "@/lib/authUtils";
import { formatDateTime } from "@/lib/date";
import { getUserInfo } from "@/services/auth.services";
import { getOwnerById } from "@/services/owner.services";
import { getPlans } from "@/services/plan.services";

export const metadata: Metadata = { title: "User" };

const UserDetailPage = async ({ params }: PageProps<"/admin/users/[id]">) => {
  const { id } = await params;
  const [owner, plans, admin] = await Promise.all([
    fetchOrNotFound(getOwnerById(id)),
    // Roles that can't read plans just don't get options to change to.
    getPlans()
      .then((response) => response.data)
      .catch(() => []),
    getUserInfo(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/admin/users">All users</BackLink>
      <OwnerProfileHeader
        owner={owner}
        actions={
          <OwnerDetailActions
            owner={owner}
            plans={plans}
            canChangeStatus={canManage(admin?.role, "ownerStatus")}
            canChangePlan={canManage(admin?.role, "ownerPlan")}
            canViewAsCustomer={canManage(admin?.role, "ownerView")}
          />
        }
      />
      <OwnerSummaryStats owner={owner} />
      {owner.status === "SUSPENDED" && owner.suspendedReason && (
        <Callout variant="warning">
          <strong>Suspended</strong> {formatDateTime(owner.suspendedAt)} &mdash; {owner.suspendedReason}
        </Callout>
      )}
      <OwnerActivityTimeline entries={owner.activityLog} />
    </div>
  );
};

export default UserDetailPage;
