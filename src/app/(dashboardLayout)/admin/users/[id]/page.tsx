import type { Metadata } from "next";
import OwnerActivityTimeline from "@/components/modules/Admin/UserManagement/OwnerActivityTimeline";
import OwnerDetailActions from "@/components/modules/Admin/UserManagement/OwnerDetailActions";
import OwnerProfileHeader from "@/components/modules/Admin/UserManagement/OwnerProfileHeader";
import OwnerSummaryStats from "@/components/modules/Admin/UserManagement/OwnerSummaryStats";
import Callout from "@/components/shared/Callout";
import { fetchOrNotFound } from "@/lib/axios/fetchOrNotFound";
import { formatDateTime } from "@/lib/date";
import { getOwnerById } from "@/services/owner.services";
import { getPlans } from "@/services/plan.services";

export const metadata: Metadata = { title: "User Details" };

const UserDetailPage = async ({ params }: PageProps<"/admin/users/[id]">) => {
  const { id } = await params;
  const [owner, plans] = await Promise.all([
    fetchOrNotFound(getOwnerById(id)),
    // Roles that can't read plans just don't get options to change to.
    getPlans()
      .then((response) => response.data)
      .catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <OwnerProfileHeader owner={owner} actions={<OwnerDetailActions owner={owner} plans={plans} />} />
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
